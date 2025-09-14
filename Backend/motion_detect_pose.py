import cv2
import time
import numpy as np
import mediapipe as mp

# ---------- Enhanced Multi-Person Config ----------
DETECTION_CONFIDENCE = 0.5
TRACKING_CONFIDENCE = 0.5
DEFAULT_THRESHOLD = 0.001
MIN_CONFIDENCE = 0.3
FONT = cv2.FONT_HERSHEY_SIMPLEX

# Initialize MediaPipe
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands
mp_face_mesh = mp.solutions.face_mesh

class PersonDetector:
    def __init__(self):
        self.prev_poses = {}
        self.prev_hands = {}
        self.detection_counts = {}
        self.last_detections = {}
        
        # Initialize pose detector for multiple people
        self.pose_detector = mp_pose.Pose(
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=DETECTION_CONFIDENCE,
            min_tracking_confidence=TRACKING_CONFIDENCE
        )
        
        # Initialize hands detector
        self.hands_detector = mp_hands.Hands(
            model_complexity=1,
            min_detection_confidence=DETECTION_CONFIDENCE,
            min_tracking_confidence=TRACKING_CONFIDENCE,
            max_num_hands=10  # Support multiple people's hands
        )

def calculate_motion(current_landmarks, prev_landmarks, landmark_type="pose"):
    """Calculate motion between current and previous landmarks."""
    if prev_landmarks is None or current_landmarks is None:
        return 0.0, []
    
    distances = []
    active_joints = []
    
    if landmark_type == "pose":
        joint_names = {
            0: "nose", 11: "left_shoulder", 12: "right_shoulder",
            13: "left_elbow", 14: "right_elbow", 15: "left_wrist", 16: "right_wrist",
            23: "left_hip", 24: "right_hip", 25: "left_knee", 26: "right_knee",
            27: "left_ankle", 28: "right_ankle"
        }
        
        for i, (curr, prev) in enumerate(zip(current_landmarks, prev_landmarks)):
            if hasattr(curr, 'visibility') and curr.visibility > MIN_CONFIDENCE:
                dist = np.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2 + (curr.z - prev.z)**2)
                distances.append(dist)
                if dist > DEFAULT_THRESHOLD and i in joint_names:
                    active_joints.append(joint_names[i])
    
    elif landmark_type == "hands":
        finger_names = {
            0: "wrist", 4: "thumb_tip", 8: "index_tip", 12: "middle_tip", 
            16: "ring_tip", 20: "pinky_tip"
        }
        
        for i, (curr, prev) in enumerate(zip(current_landmarks, prev_landmarks)):
            dist = np.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2 + (curr.z - prev.z)**2)
            distances.append(dist)
            if dist > DEFAULT_THRESHOLD and i in finger_names:
                active_joints.append(finger_names[i])
    
    avg_motion = np.mean(distances) if distances else 0.0
    return avg_motion, active_joints

def detect_multiple_people(frame, detector):
    """Detect and track multiple people in the frame."""
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Detect poses
    pose_results = detector.pose_detector.process(rgb_frame)
    
    # Detect hands
    hand_results = detector.hands_detector.process(rgb_frame)
    
    detections = []
    current_time = time.time()
    
    # Process pose detections
    if pose_results.pose_landmarks:
        person_id = 0  # For now, handle one pose person
        
        # Calculate pose motion
        pose_motion = 0.0
        active_pose_joints = []
        
        if person_id in detector.prev_poses:
            pose_motion, active_pose_joints = calculate_motion(
                pose_results.pose_landmarks.landmark,
                detector.prev_poses[person_id],
                "pose"
            )
        
        detector.prev_poses[person_id] = pose_results.pose_landmarks.landmark
        
        # Check for detection
        if pose_motion > DEFAULT_THRESHOLD:
            if person_id not in detector.detection_counts:
                detector.detection_counts[person_id] = 0
            detector.detection_counts[person_id] += 1
            detector.last_detections[person_id] = current_time
            
            detections.append({
                'person_id': person_id,
                'type': 'pose',
                'motion': pose_motion,
                'active_joints': active_pose_joints,
                'landmarks': pose_results.pose_landmarks
            })
    
    # Process hand detections
    if hand_results.multi_hand_landmarks:
        for hand_id, hand_landmarks in enumerate(hand_results.multi_hand_landmarks):
            hand_motion = 0.0
            active_hand_joints = []
            
            if hand_id in detector.prev_hands:
                hand_motion, active_hand_joints = calculate_motion(
                    hand_landmarks.landmark,
                    detector.prev_hands[hand_id],
                    "hands"
                )
            
            detector.prev_hands[hand_id] = hand_landmarks.landmark
            
            # Check for hand motion detection
            if hand_motion > DEFAULT_THRESHOLD:
                hand_person_id = f"hand_{hand_id}"
                if hand_person_id not in detector.detection_counts:
                    detector.detection_counts[hand_person_id] = 0
                detector.detection_counts[hand_person_id] += 1
                detector.last_detections[hand_person_id] = current_time
                
                handedness = hand_results.multi_handedness[hand_id].classification[0].label
                
                detections.append({
                    'person_id': hand_person_id,
                    'type': f'{handedness.lower()}_hand',
                    'motion': hand_motion,
                    'active_joints': active_hand_joints,
                    'landmarks': hand_landmarks
                })
    
    return detections, pose_results, hand_results

def draw_clean_overlay(frame, detections, detector, motion_threshold, total_detections):
    """Draw a clean, modern UI overlay."""
    h, w = frame.shape[:2]
    
    # Semi-transparent dark overlay for header
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
    
    # Main title
    cv2.putText(frame, "Multi-Person Motion Detector", (15, 25), 
                FONT, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
    
    # Status info
    cv2.putText(frame, f"Sensitivity: {motion_threshold:.3f}", (15, 45), 
                FONT, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
    cv2.putText(frame, f"Total Detections: {total_detections}", (15, 65), 
                FONT, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
    
    # People count
    active_people = len([p for p in detector.last_detections.keys() 
                        if time.time() - detector.last_detections[p] < 1.0])
    cv2.putText(frame, f"Active People: {active_people}", (w-180, 25), 
                FONT, 0.6, (100, 255, 100), 2, cv2.LINE_AA)
    
    # Detection indicators for each person
    y_offset = 100
    for detection in detections:
        person_id = detection['person_id']
        motion_type = detection['type']
        motion_value = detection['motion']
        active_joints = detection['active_joints']
        
        # Person detection box
        box_color = (50, 200, 50) if motion_value > motion_threshold else (100, 100, 100)
        cv2.rectangle(frame, (10, y_offset-5), (w-10, y_offset+35), box_color, 2)
        
        # Person info
        person_text = f"Person {person_id} - {motion_type.title()}"
        cv2.putText(frame, person_text, (15, y_offset+15), 
                    FONT, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
        
        # Motion value
        motion_text = f"Motion: {motion_value:.4f}"
        cv2.putText(frame, motion_text, (w-150, y_offset+15), 
                    FONT, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
        
        # Active joints
        if active_joints:
            joints_text = f"Active: {', '.join(active_joints[:3])}"
            if len(active_joints) > 3:
                joints_text += f"... (+{len(active_joints)-3})"
            cv2.putText(frame, joints_text, (15, y_offset+30), 
                        FONT, 0.4, (150, 255, 150), 1, cv2.LINE_AA)
        
        y_offset += 50
    
    # Global detection indicator
    any_recent_detection = any(time.time() - last_time < 0.5 
                             for last_time in detector.last_detections.values())
    
    if any_recent_detection:
        # Subtle detection indicator
        cv2.rectangle(frame, (w-200, 45), (w-10, 75), (0, 200, 0), -1)
        cv2.putText(frame, "MOTION DETECTED", (w-195, 65), 
                    FONT, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

def draw_landmarks(frame, pose_results, hand_results):
    """Draw pose and hand landmarks."""
    # Draw pose landmarks
    if pose_results.pose_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            pose_results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
        )
    
    # Draw hand landmarks
    if hand_results.multi_hand_landmarks:
        for hand_landmarks in hand_results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_hand_landmarks_style()
            )

def open_camera():
    """Open camera with optimal settings."""
    for idx in [0, 1, 2]:
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_FPS, 30)
            ok, _ = cap.read()
            if ok:
                return cap, idx
            cap.release()
    raise RuntimeError("Could not open camera")

def main():
    motion_threshold = DEFAULT_THRESHOLD
    
    try:
        cap, cam_idx = open_camera()
        print(f"✅ Camera {cam_idx} ready - Multi-person detection active")
        print("🎮 Controls: '['/']' sensitivity | 'r' reset | 'q' quit")
    except RuntimeError as e:
        print(f"❌ {e}")
        return

    detector = PersonDetector()
    total_detections = 0
    frame_count = 0

    print("🔍 Scanning for multiple people...")
    
    while True:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.02)
            continue

        frame_count += 1
        frame = cv2.flip(frame, 1)
        
        # Detect all people in frame
        detections, pose_results, hand_results = detect_multiple_people(frame, detector)
        
        # Count total detections
        if detections:
            total_detections += len(detections)
            for detection in detections:
                print(f"🎯 Detection: {detection['type']} | Motion: {detection['motion']:.4f} | "
                      f"Joints: {', '.join(detection['active_joints'])}")
        
        # Draw landmarks
        draw_landmarks(frame, pose_results, hand_results)
        
        # Draw clean UI
        draw_clean_overlay(frame, detections, detector, motion_threshold, total_detections)
        
        cv2.imshow("Multi-Person Motion Detection", frame)
        key = cv2.waitKey(1) & 0xFF

        # Controls
        if key == ord('['):
            motion_threshold = max(0.0001, motion_threshold - 0.0002)
            print(f"🔧 Sensitivity increased: {motion_threshold:.4f}")
        elif key == ord(']'):
            motion_threshold = min(0.01, motion_threshold + 0.0002)
            print(f"🔧 Sensitivity decreased: {motion_threshold:.4f}")
        elif key == ord('r'):
            motion_threshold = DEFAULT_THRESHOLD
            total_detections = 0
            detector = PersonDetector()
            print("🔄 Reset complete")
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\n📊 Session Summary: {total_detections} total detections over {frame_count} frames")

if __name__ == "__main__":
    main()