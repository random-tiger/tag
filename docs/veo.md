Veo on Vertex AI API

bookmark_border
Release Notes

Veo is the name of the model that supports video generation. Veo generates a video from a text prompt or an image prompt that you provide. For more information about Veo, see Veo video generation overview.

To explore this model in the console, see the Video Generation model card in the Model Garden.

Note: To generate videos from an image, use one of the following models:

veo-2.0-generate-001
veo-3.0-generate-preview
Try Veo on Vertex AI (Vertex AI Studio)

Try Veo in a Colab

Supported Models
Veo API supports the following models:

veo-2.0-generate-001
veo-3.0-generate-001
veo-3.0-fast-generate-001
veo-3.0-generate-preview (Preview)
veo-3.0-fast-generate-preview (Preview)
HTTP request


curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:predictLongRunning \

-d '{
  "instances": [
    {
      "prompt": string,
      "image": {
        // Union field can be only one of the following:
        "bytesBase64Encoded": string,
        "gcsUri": string,
        // End of list of possible types for union field.
        "mimeType": string
      },
      "lastFrame": {
        // Union field can be only one of the following:
        "bytesBase64Encoded": string,
        "gcsUri": string,
        // End of list of possible types for union field.
        "mimeType": string
      },
      "video": {
        // Union field can be only one of the following:
        "bytesBase64Encoded": string,
        "gcsUri": string,
        // End of list of possible types for union field.
        "mimeType": string
      }
    }
  ],
  "parameters": {
    "aspectRatio": string,
    "durationSeconds": integer,
    "enhancePrompt": boolean,
    "generateAudio": boolean,
    "negativePrompt": string,
    "personGeneration": string,
    "resolution": string, // Veo 3 models only
    "sampleCount": integer,
    "seed": uint32,
    "storageUri": string
  }
}'
Instances
prompt

string

Required for text-to-video. Optional if an input image prompt is provided (image-to-video).

A text string that describes the video that you want to generate. For example:

A fast-tracking shot through a bustling dystopian sprawl with bright neon signs, flying cars and mist, night, lens flare, volumetric lighting
A neon hologram of a car driving at top speed, speed of light, cinematic, incredible details, volumetric lighting
Many spotted jellyfish pulsating under water. Their bodies are transparent and glowing in deep ocean
extreme close-up with a shallow depth of field of a puddle in a street. reflecting a busy futuristic Tokyo city with bright neon signs, night, lens flare
Timelapse of the northern lights dancing across the Arctic sky, stars twinkling, snow-covered landscape
A lone cowboy rides his horse across an open plain at beautiful sunset, soft light, warm colors
Union field image.

Optional. An image to guide video generation. Provide the image as either a bytesBase64Encoded string or a gcsUri string that points to a Cloud Storage bucket location.

Image-to-video is supported by the following models:

veo-2.0-generate-001
veo-3.0-generate-preview
Union field lastFrame.

Optional. An image to use as the final frame for video in-filling (generating the video content that leads up to the frame). Provide the image as either a bytesBase64Encoded string or a gcsUri string that points to a Cloud Storage bucket location.

Supported by veo-2.0-generate-001 only.

Union field video.

Optional. A Veo generated video to extend in length. Provide the video as either a bytesBase64Encoded string or a gcsUri string that points to a Cloud Storage bucket location.

Supported by veo-2.0-generate-001 only.

bytesBase64Encoded	
string

A Base64-encoded string of the image or video file's bytes.

gcsUri	
string

A string URI to a Cloud Storage bucket location.

mimeType	
string

Required for the following objects:

image
video
lastFrame
Specifies the mime type of a video or image.

For images, the following mime types are accepted:

image/jpeg
image/png
For videos, the following mime types are accepted:

video/mp4
Parameters
aspectRatio	
string

Optional. Specifies the aspect ratio of generated videos. The following are accepted values:

16:9 (default)
9:16 (not supported by veo-3.0-generate-preview)
durationSeconds	
integer

Required. The length in seconds of the video files that you want to generate.

The accepted values for each model are:

veo-2.0-generate-001: 5-8. The default is 8.
veo-3.0-generate-preview: 8.
enhancePrompt	
boolean

Optional. Specifies whether to use Gemini to enhance your prompt. Accepted values are true or false. The default is true.

generateAudio	
boolean

Required for veo-3.0-generate-preview. Specifies whether to generate audio for the video. Accepted values are true or false.

This parameter isn't supported by veo-2.0-generate-001.

negativePrompt	
string

Optional. A text string that describes anything you want to discourage the model from generating. For example:

overhead lighting, bright colors
people, animals
multiple cars, wind
personGeneration	
string

Optional. The safety setting that controls whether people or face generation is allowed. One of the following:

allow_adult (default): allow generation of adults only.
dont_allow: disallows inclusion of people or faces in images.
resolution	
string

Optional. Veo 3 models only. The resolution of the generated video. Accepted values are 720p (default) or 1080p.

sampleCount	
int

Optional. The number of video samples to generate. Accepted values are 1 to 4.

seed	
uint32

Optional. A number used to initialize the random generation process. Using the same seed, prompt, and other parameters results in the same output videos, making the generation deterministic.

The accepted range is 0 to 4,294,967,295.

storageUri	
string

Optional. A Cloud Storage bucket URI to store the output video, in the format gs://BUCKET_NAME/SUBDIRECTORY. If you don't provide a Cloud Storage bucket, base64-encoded video bytes are returned in the response.

Sample request
Use the following requests to send a text-to-video request or an image-to-video request:

Text-to-video generation request
REST
To test a text prompt by using the Vertex AI Veo API, send a POST request to the publisher model endpoint.

Before using any of the request data, make the following replacements:

PROJECT_ID: Your Google Cloud project ID.
MODEL_ID: The model ID to use. Available values:
veo-2.0-generate-001
veo-3.0-generate-001
veo-3.0-fast-generate-001
veo-3.0-generate-preview (Preview)
veo-3.0-fast-generate-preview (Preview)
TEXT_PROMPT: The text prompt used to guide video generation.
OUTPUT_STORAGE_URI: Optional: The Cloud Storage bucket to store the output videos. If not provided, video bytes are returned in the response. For example: gs://video-bucket/output/.
RESPONSE_COUNT: The number of video files you want to generate. Accepted integer values: 1-4.
DURATION: The length of video files that you want to generate. Accepted integer values are 5-8.
Additional optional parameters

HTTP method and URL:



POST https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predictLongRunning
Request JSON body:



{
  "instances": [
    {
      "prompt": "TEXT_PROMPT"
    }
  ],
  "parameters": {
    "storageUri": "OUTPUT_STORAGE_URI",
    "sampleCount": "RESPONSE_COUNT"
  }
}
To send your request, choose one of these options:

curl
PowerShell
Note: The following command assumes that you have logged in to the gcloud CLI with your user account by running gcloud init or gcloud auth login , or by using Cloud Shell, which automatically logs you into the gcloud CLI . You can check the currently active account by running gcloud auth list.
Save the request body in a file named request.json, and execute the following command:



curl -X POST \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json; charset=utf-8" \
     -d @request.json \
     "https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predictLongRunning"
This request returns a full operation name with a unique operation ID. Use this full operation name to poll that status of the video generation request.

{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/a1b07c8e-7b5a-4aba-bb34-3e1ccb8afcc8"
}
Image-to-video generation request
REST
To test a text prompt by using the Vertex AI Veo API, send a POST request to the publisher model endpoint.

Before using any of the request data, make the following replacements:

PROJECT_ID: Your Google Cloud project ID.
MODEL_ID: The model ID to use. Available values:
veo-2.0-generate-001 (GA)
veo-3.0-generate-preview (Preview)
TEXT_PROMPT: The text prompt used to guide video generation.
INPUT_IMAGE: Base64-encoded bytes string representing the input image. To ensure quality, the input image should be 720p or higher (1280 x 720 pixels) and have a 16:9 or 9:16 aspect ratio. Images of other aspect ratios or sizes may be resized or centrally cropped during the upload process.
MIME_TYPE: The MIME type of the input image. Only the images of the following MIME types are supported: image/jpeg or image/png.
OUTPUT_STORAGE_URI: Optional: The Cloud Storage bucket to store the output videos. If not provided, video bytes are returned in the response. For example: gs://video-bucket/output/.
RESPONSE_COUNT: The number of video files you want to generate. Accepted integer values: 1-4.
DURATION: The length of video files that you want to generate. Accepted integer values are 5-8.
Additional optional parameters

HTTP method and URL:



POST https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predictLongRunning
Request JSON body:



{
  "instances": [
    {
      "prompt": "TEXT_PROMPT",
      "image": {
        "bytesBase64Encoded": "INPUT_IMAGE",
        "mimeType": "MIME_TYPE"
      }
    }
  ],
  "parameters": {
    "storageUri": "OUTPUT_STORAGE_URI",
    "sampleCount": RESPONSE_COUNT
  }
}
To send your request, choose one of these options:

curl
PowerShell
Note: The following command assumes that you have logged in to the gcloud CLI with your user account by running gcloud init or gcloud auth login , or by using Cloud Shell, which automatically logs you into the gcloud CLI . You can check the currently active account by running gcloud auth list.
Save the request body in a file named request.json, and execute the following command:



curl -X POST \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json; charset=utf-8" \
     -d @request.json \
     "https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:predictLongRunning"
This request returns a full operation name with a unique operation ID. Use this full operation name to poll that status of the video generation request.

{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/a1b07c8e-7b5a-4aba-bb34-3e1ccb8afcc8"
}
Poll the status of the video generation long-running operation
Check the status of the video generation long-running operation.

REST

Before using any of the request data, make the following replacements:

PROJECT_ID: Your Google Cloud project ID.
MODEL_ID: The model ID to use.
OPERATION_ID: The unique operation ID returned in the original generate video request.
HTTP method and URL:



POST https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation
Request JSON body:



{
  "operationName": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
}
To send your request, choose one of these options:

curl
PowerShell
Note: The following command assumes that you have logged in to the gcloud CLI with your user account by running gcloud init or gcloud auth login , or by using Cloud Shell, which automatically logs you into the gcloud CLI . You can check the currently active account by running gcloud auth list.
Save the request body in a file named request.json, and execute the following command:



curl -X POST \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json; charset=utf-8" \
     -d @request.json \
     "https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID:fetchPredictOperation"
This request returns information about the operation, including if the operation is still running or is done.
Response
Response body (generate video request)
Sending a text-to-video or image-to-video request returns the following response:



{
  "name": string
}
Response element	Description
name	The full operation name of the long-running operation that begins after a video generation request is sent.
Sample response (generate video request)


{
  "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID"
}
Response body (poll long-running operation)
Polling the status of the original video generation long-running operation returns a response similar to the following:



{
   "name": string,
   "done": boolean,
   "response":{
      "@type":"type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
      "raiMediaFilteredCount": integer,
      "videos":[
         {
           "gcsUri": string,
           "mimeType": string
         },
         {
           "gcsUri": string,
           "mimeType": string
         },
         {
           "gcsUri": string,
           "mimeType": string
         },
         {
           "gcsUri": string,
           "mimeType": string
         },
      ]
   }
}
Note: If you didn't specify a Cloud Storage bucket URI in storageUri, then the videos object returns bytesBase64Encoded strings.
Response element	Description
bytesBase64Encoded	A Base64 bytes encoded string that represents the video object.
done	A boolean value that indicates whether the operation is complete.
encoding	The video encoding type.
gcsUri	The Cloud Storage URI of the generated video.
name	The full operation name of the long-running operation that begins after a video generation request is sent.
raiMediaFilteredCount	Returns a count of videos that Veo filtered due to responsible AI policies. If no videos are filtered, the returned count is 0.
raiMediaFilteredReasons	Lists the reasons for any Veo filtered videos due to responsible AI policies. For more information, see Safety filter code categories.
response	The response body of the long-running operation.
video	The generated video.
Sample response (poll long-running operation)


{
   "name": "projects/PROJECT_ID/locations/us-central1/publishers/google/models/MODEL_ID/operations/OPERATION_ID",
   "done":true,
   "response":{
      "@type":"type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse",
      "raiMediaFilteredCount": 0,
      "videos":[
        {
          "gcsUri":"gs://STORAGE_BUCKET/TIMESTAMPED_SUBDIRECTORY/sample_0.mp4",
          "mimeType":"video/mp4"
        },
        {
          "gcsUri":"gs://STORAGE_BUCKET/TIMESTAMPED_SUBDIRECTORY/sample_1.mp4",
          "mimeType":"video/mp4"
        },
        {
          "gcsUri":"gs://STORAGE_BUCKET/TIMESTAMPED_SUBDIRECTORY/sample_2.mp4",
          "mimeType":"video/mp4"
        },
        {
          "gcsUri":"gs://STORAGE_BUCKET/TIMESTAMPED_SUBDIRECTORY/sample_3.mp4",
          "mimeType":"video/mp4"
        }
      ]
   }
}