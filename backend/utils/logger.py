"""
Logging configuration and utilities
"""

import logging
import sys
from datetime import datetime
import json

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields if available
        if hasattr(record, 'story_id'):
            log_entry['story_id'] = record.story_id
        if hasattr(record, 'operation_id'):
            log_entry['operation_id'] = record.operation_id
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
            
        return json.dumps(log_entry)

def setup_logging(app):
    """Setup application logging with structured output"""
    
    # Clear existing handlers
    app.logger.handlers.clear()
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredFormatter())
    
    # Set log level
    log_level = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    app.logger.setLevel(log_level)
    console_handler.setLevel(log_level)
    
    # Add handler to app logger
    app.logger.addHandler(console_handler)
    
    # Also configure root logger so library/service loggers propagate to console
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_console = logging.StreamHandler(sys.stdout)
    root_console.setFormatter(StructuredFormatter())
    root_console.setLevel(log_level)
    root_logger.addHandler(root_console)
    
    # Capture warnings module as logs
    logging.captureWarnings(True)
    
    # Configure other loggers
    logging.getLogger('google').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    app.logger.info("Logging configured successfully")

def get_logger_with_context(**context):
    """Get logger with additional context fields"""
    logger = logging.getLogger(__name__)
    
    # Create a custom LoggerAdapter that adds context
    class ContextAdapter(logging.LoggerAdapter):
        def process(self, msg, kwargs):
            for key, value in self.extra.items():
                setattr(kwargs.get('extra', {}), key, value)
            return msg, kwargs
    
    return ContextAdapter(logger, context)
