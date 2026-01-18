import cv2
import torch
import moviepy as mp

model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True, force_reload=True)
images = ['http://images.cocodataset.org/val2017/000000039769.jpg', 'https://ultralytics.com/images/zidane.jpg']

# model.info()
# results = model(images)
# results.print()
# results.save()

# video stuff
vid = "./frontend/body_worn_camera_example_footage.mp4"
# vid = "./test_vid.mp4"
vidcap = cv2.VideoCapture(vid)
audio = mp.VideoFileClip(vid)

width, height, fps = 0, 0, 0

if not vidcap.isOpened():
    print("Error, could not open file")
else:
    width = int(vidcap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(vidcap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(vidcap.get(cv2.CAP_PROP_FPS))

print(f"Width: {width}\nHeight: {height}")

# width, height = 640, 360

count = 0
success = True
vid_name = "body_cam_model_test"
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
full_vid = cv2.VideoWriter(vid_name, fourcc, fps, (width, height))

try:
    while success:
        success, image = vidcap.read()
        try:
            if success:
                results = model(image)
                results.print()
                results.render()
                # full_vid.write(cv2.imread(path))
                frame = results.ims[0]
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                full_vid.write(frame)
                # shutil.rmtree("./runs/")
                # print("Deleted 1 image to runs/detect/exp")
                count+=1
        except Exception as e:
            print(f"ERROR:\n{e}")
            break

finally:
    vidcap.release()
    full_vid.release()
    cv2.destroyAllWindows()

    audio = mp.VideoFileClip(vid)
    video = mp.VideoFileClip(vid_name)

    video.with_audio(audio)
    video.write_videofile(vid_name)