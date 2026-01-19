# import cv2
# import torch
# import moviepy as mp
# from ultralytics import YOLO
# import time

# """test for yolov8 through YOLO lib"""
# # model = YOLO("yolov8n.pt")
# # results = model(images)
# # results[0].show()
# # try:
# #     results.render()
# #     print("yay")
# # except Exception as e:
# #     print("not yay")
# # results[0].save(filename="test_yolo26_m.jpg")


# model = torch.hub.load("ultralytics/yolov5", "yolov5x6", pretrained=True, force_reload=True)
# # print(torch.hub.list("ultralytics/yolov5"))


# """
# # MODEL TESTING ON IMAGES
# # images = ['http://images.cocodataset.org/val2017/000000039769.jpg', 'https://ultralytics.com/images/zidane.jpg']
# # results = model(images)
# # results.print()
# # results.save()
# """

# # video stuff
# vid = "./body_worn_camera_example_footage.mp4"
# # vid = "./test_vid.mp4"
# vidcap = cv2.VideoCapture(vid)
# audio = mp.VideoFileClip(vid)

# width, height, fps = 0, 0, 0

# if not vidcap.isOpened():
#     print("Error, could not open file")
# else:
#     width = int(vidcap.get(cv2.CAP_PROP_FRAME_WIDTH))
#     height = int(vidcap.get(cv2.CAP_PROP_FRAME_HEIGHT))
#     fps = int(vidcap.get(cv2.CAP_PROP_FPS))

# print(f"Width: {width}\nHeight: {height}")

# # width, height = 640, 360

# count = 0
# success = True
# vid_name = "body_cam_model_test"
# fourcc = cv2.VideoWriter_fourcc(*"mp4v")
# full_vid = cv2.VideoWriter(vid_name, fourcc, fps, (width, height))

# redaction = True

# try:
#     while success:
#         success, image = vidcap.read()
#         try:
#             if success:
#                 results = model(image)
#                 obj: str = results.print()
#                 print(obj)
#                 try:
#                     if redaction:
#                         if "cat" in obj:
#                             boxes_df = results.pandas().xyxy[0]
#                             print(boxes_df.head())
#                 except Exception as e:
#                     print(e)
#                     continue

#                 results.render()
#                 # full_vid.write(cv2.imread(path))
#                 frame = results.ims[0]
                        
#                 frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
#                 full_vid.write(frame)
#                 # shutil.rmtree("./runs/")
#                 # print("Deleted 1 image to runs/detect/exp")
#                 count+=1
#         except Exception as e:
#             print(f"ERROR:\n{e}")
#             break

# finally:
#     vidcap.release()
#     full_vid.release()
#     cv2.destroyAllWindows()
#     time.sleep(10)

#     try:
#         audio = mp.VideoFileClip(vid)
#         audio = audio.audio

#         vid_file_name = vid_name+".mp4"
#         video = mp.VideoFileClip(vid_file_name)

#         file_export = vid_name + "_audio.mp4"
#         video = video.with_audio(audio)
#         video.write_videofile(file_export, codec="libx264", audio_codec="aac")
#         video.close()
#         audio.close()
#     except Exception as e:
#         print(f"Audio Export Failed\n{e}")

import cv2
import torch
import moviepy.editor as mp
# from ultralytics import YOLO
import time
import matplotlib.pyplot as plt
import cv2
from scipy.ndimage import gaussian_filter
import numpy as np

"""test for yolov8 through YOLO lib"""
# model = YOLO("yolov8n.pt")
# results = model(images)
# results[0].show()
# try:
#     results.render()
#     print("yay")
# except Exception as e:
#     print("not yay")
# results[0].save(filename="test_yolo26_m.jpg")


model = torch.hub.load("ultralytics/yolov5", "yolov5x6", pretrained=True, force_reload=True)
# print(torch.hub.list("ultralytics/yolov5"))

# MODEL TESTING ON IMAGES
images = ['http://images.cocodataset.org/val2017/000000039769.jpg', 'https://ultralytics.com/images/zidane.jpg']
results = model(images)
results.print()
# print(detect)
# if "cat" in detect:
img = results.ims[0]
img = img.copy()
if True:
  boxes_df = results.pandas().xyxy[0]
  if True:
    first_obj_params = boxes_df.loc[boxes_df["name"] == "cat"]
    # first_obj_params = [int(boxes_df[column][0]) for column in list(boxes_df.columns[:4])]
    print(first_obj_params)
    for index, row in first_obj_params.iterrows():
      first_obj_params = np.array(first_obj_params)
      df_obj_del = [int(row[column]) for column in list(boxes_df.columns[:4])]
      # print(first_obj_params[0])
      img[df_obj_del[1]:df_obj_del[3], df_obj_del[0]:df_obj_del[2]] = gaussian_filter(img[df_obj_del[1]:df_obj_del[3], df_obj_del[0]:df_obj_del[2]], sigma=7)
      # print(first_obj_params)
    print(boxes_df.head())

# results.render()
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
# cv2.imwrite("test_blur_img.jpg", img)
plt.imshow(img)
plt.show()

# video stuff
vid = "./body_worn_camera_example_footage.mp4"
# vid = "./test_vid.mp4"
vidcap = cv2.VideoCapture(vid)
audio = mp.VideoFileClip(vid)
audio = audio.audio

width, height, fps = 0, 0, 0

if not vidcap.isOpened():
    print("Error, could not open file")
else:
    width = int(vidcap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(vidcap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(vidcap.get(cv2.CAP_PROP_FPS))

print(f"Width: {width} Height: {height}\n")

# width, height = 640, 360

success = True
vid_name = "body_cam_model_test"
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
full_vid = cv2.VideoWriter(vid_name+".mp4", fourcc, fps, (width, height))

try:
    while success:
        success, image = vidcap.read()
        try:
            if success:
                results = model(image)
                results.print()
                results.render()
                # full_vid.write(cv2.imread(path))
                frame = results.ims[0].copy()
                bound_box_df = results.pandas().xyxy[0]
                # obj_params = bound_box_df.loc[bound_box_df["name"] == "person"]
                obj_params = bound_box_df[bound_box_df["name"] == "laptop"]
                for _, row in obj_params.iterrows():
                  # new_obj_params = [int(row(column)) for column in list(bound_box_df.columns[:4])]
                  x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
                  # frame[new_obj_params[1]:new_obj_params[3], new_obj_params[0]:new_obj_params[2]] = gaussian_filter(frame[new_obj_params[1]:new_obj_params[3], new_obj_params[0]:new_obj_params[2]], 7)
                  roi = frame[y1:y2, x1:x2]
                  blurred = cv2.GaussianBlur(roi, (99, 99), 30)
                  frame[y1:y2, x1:x2] = blurred
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                full_vid.write(frame)
        except Exception as e:
            print(f"ERROR:\n{e}")
            break

finally:
    vidcap.release()
    full_vid.release()
    cv2.destroyAllWindows()
    # time.sleep(10)

    try:
        vid_file_name = vid_name+".mp4"
        video = mp.VideoFileClip(vid_file_name)

        file_export = vid_name + "_audio.mp4"
        video = video.set_audio(audio)
        video.write_videofile(file_export, codec="libx264", audio_codec="aac")
        video.close()
        audio.close()

        # from google.colab import files
        # files.download(vid_name+".mp4")

    except Exception as e:
        print(f"\nAudio Export Failed\n{e}")