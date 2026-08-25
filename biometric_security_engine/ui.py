import streamlit as st
import requests
import cv2
import base64
import time

st.set_page_config(page_title="Biometric Portal", layout="centered")

API_URL = "http://127.0.0.1:8000/api/biometrics"

def encode_image(img_bytes):
    return base64.b64encode(img_bytes).decode('utf-8')

def check_api_health():
    try:
        r = requests.get("http://127.0.0.1:8000/docs", timeout=2)
        return r.status_code == 200
    except Exception:
        return False

# Session State Initializations
if "reg_result" not in st.session_state:
    st.session_state.reg_result = None
if "auth_result" not in st.session_state:
    st.session_state.auth_result = None
if "motion_challenges" not in st.session_state:
    st.session_state.motion_challenges = ["TURN_LEFT", "TURN_RIGHT", "CIRCULAR_MOTION"]
if "motion_step" not in st.session_state:
    st.session_state.motion_step = 0
if "step_results" not in st.session_state:
    st.session_state.step_results = {}
if "liveness_verified" not in st.session_state:
    st.session_state.liveness_verified = False

st.title("🛡️ University Biometric Security Portal")

api_online = check_api_health()
if api_online:
    st.success("🟢 API Server: **Online & Ready** (`http://127.0.0.1:8000`)")
else:
    st.error("🔴 API Server: **Offline / Not Connected**! Please run `uvicorn api.main:app --reload` in your terminal.")

tabs = st.tabs(["📝 Registration", "🔑 Authentication", "🔄 Interactive 3D Motion Wizard"])

# --- TAB 1: REGISTRATION ---
with tabs[0]:
    st.header("Student Registration")
    st.markdown("Ensure you are well-lit and facing forward. The **Quality Gate** will verify brightness & blur before enrollment.")
    
    student_id_reg = st.text_input("Enter Student ID for Registration:")
    reg_photo = st.camera_input("Take a photo to register", key="reg_cam")
    
    if reg_photo and student_id_reg:
        if not st.session_state.liveness_verified:
            st.warning("⚠️ **Liveness verification required!** Please go to the **🔄 Interactive 3D Motion Wizard** tab first and complete all motion challenges before registering.")
        else:
            if st.button("Submit Registration"):
                with st.spinner("Processing registration..."):
                    b64_img = encode_image(reg_photo.getvalue())
                    payload = {"student_id": student_id_reg, "image_base64": b64_img, "liveness_token": "motion_verified"}
                    
                    try:
                        resp = requests.post(f"{API_URL}/register", json=payload, timeout=10)
                        if resp.status_code == 200:
                            st.session_state.reg_result = ("success", f"{resp.json()['message']}")
                            st.session_state.liveness_verified = False  # One-time use
                        else:
                            detail = resp.json().get('detail', 'Unknown error') if resp.headers.get('content-type') == 'application/json' else resp.text
                            st.session_state.reg_result = ("error", f"Error {resp.status_code}: {detail}")
                    except Exception as e:
                        st.session_state.reg_result = ("error", f"Failed to connect to API: {e}")

    if st.session_state.reg_result:
        res_type, res_msg = st.session_state.reg_result
        if res_type == "success":
            st.success(res_msg)
        else:
            st.error(res_msg)

# --- TAB 2: AUTHENTICATION ---
with tabs[1]:
    st.header("Secure Authentication")
    st.markdown("Verify your identity. If successful, you will receive a signed **JWT Secure Token**.")
    
    student_id_auth = st.text_input("Enter Student ID to login:")
    auth_photo = st.camera_input("Take a photo to authenticate", key="auth_cam")
    
    if auth_photo and student_id_auth:
        if st.button("Submit Authentication"):
            with st.spinner("Authenticating..."):
                b64_img = encode_image(auth_photo.getvalue())
                payload = {"student_id": student_id_auth, "image_base64": b64_img}
                
                try:
                    resp = requests.post(f"{API_URL}/authenticate", json=payload, timeout=10)
                    if resp.status_code == 200:
                        data = resp.json()
                        st.session_state.auth_result = ("success", data)
                    else:
                        detail = resp.json().get('detail', 'Unknown error') if resp.headers.get('content-type') == 'application/json' else resp.text
                        st.session_state.auth_result = ("error", f"Error {resp.status_code}: {detail}")
                except Exception as e:
                    st.session_state.auth_result = ("error", f"Failed to connect to API: {e}")

    if st.session_state.auth_result:
        res_type, res_data = st.session_state.auth_result
        if res_type == "success":
            st.success(f"Authenticated Successfully! (Distance: {res_data['distance']:.2f})")
            st.code(f"JWT Token Generated:\n{res_data['token']}", language="json")
        else:
            st.error(res_data)

# --- TAB 3: INTERACTIVE 3D MOTION WIZARD ---
with tabs[2]:
    st.header("🔄 Interactive 3D Head Pose & Motion Active Liveness")
    st.markdown("Prove you are alive by performing requested physical head movements in 3D space!")
    
    if st.button("🎲 Generate New Motion Challenge Sequence"):
        try:
            r = requests.get(f"{API_URL}/challenge/generate")
            if r.status_code == 200:
                st.session_state.motion_challenges = r.json()["challenges"]
                st.session_state.motion_step = 0
                st.session_state.step_results = {}
                st.rerun()
        except Exception as e:
            st.error(f"Failed to fetch challenge: {e}")

    st.subheader("Assigned Challenge Sequence:")
    cols = st.columns(len(st.session_state.motion_challenges))
    for idx, chal in enumerate(st.session_state.motion_challenges):
        icon = "👈" if chal == "TURN_LEFT" else "👉" if chal == "TURN_RIGHT" else "👆" if chal == "LOOK_UP" else "👇" if chal == "LOOK_DOWN" else "🔄"
        status = "✅ Passed" if idx in st.session_state.step_results else ("👉 Active" if idx == st.session_state.motion_step else "🔒 Pending")
        cols[idx].metric(label=f"Step {idx+1}: {icon} {chal}", value=status)

    curr_idx = st.session_state.motion_step
    if curr_idx < len(st.session_state.motion_challenges):
        current_chal = st.session_state.motion_challenges[curr_idx]
        
        st.info(f"### Current Instruction: **{current_chal}**")
        
        if current_chal == "CIRCULAR_MOTION":
            st.markdown("Take 4 consecutive snapshots while slowly moving your head in a full circular motion.")
            f1 = st.camera_input("Circular Snapshot 1 (Left)", key="m_circ1")
            f2 = st.camera_input("Circular Snapshot 2 (Up)", key="m_circ2")
            f3 = st.camera_input("Circular Snapshot 3 (Right)", key="m_circ3")
            f4 = st.camera_input("Circular Snapshot 4 (Down)", key="m_circ4")
            
            if f1 and f2 and f3 and f4:
                if st.button("Verify Circular Motion Sequence"):
                    with st.spinner("Analyzing 3D orbital motion coverage..."):
                        frames = [encode_image(f1.getvalue()), encode_image(f2.getvalue()), encode_image(f3.getvalue()), encode_image(f4.getvalue())]
                        payload = {"frames_base64": frames}
                        try:
                            resp = requests.post(f"{API_URL}/challenge/verify_circular", json=payload, timeout=15)
                            if resp.status_code == 200:
                                st.session_state.step_results[curr_idx] = True
                                st.session_state.motion_step += 1
                                st.success("🎉 Circular Motion Sequence Passed!")
                                st.rerun()
                            else:
                                detail = resp.json().get('detail', 'Failed') if resp.headers.get('content-type') == 'application/json' else resp.text
                                st.error(f"❌ {detail}")
                        except Exception as e:
                            st.error(f"Connection error: {e}")
        else:
            prompt_map = {
                "TURN_LEFT": "👈 Turn your head clearly to your **LEFT** (Yaw <= -20°)",
                "TURN_RIGHT": "👉 Turn your head clearly to your **RIGHT** (Yaw >= +20°)",
                "LOOK_UP": "👆 Tilt your head **UP** towards the ceiling (Pitch >= +18°)",
                "LOOK_DOWN": "👇 Tilt your head **DOWN** towards your desk (Pitch <= -18°)",
            }
            st.write(prompt_map.get(current_chal, current_chal))
            motion_photo = st.camera_input(f"Capture {current_chal} Pose", key=f"step_cam_{curr_idx}")
            
            if motion_photo:
                if st.button(f"Verify Step {curr_idx+1}: {current_chal}"):
                    with st.spinner(f"Computing 3D Head Pose angles for {current_chal}..."):
                        b64_img = encode_image(motion_photo.getvalue())
                        payload = {"challenge_type": current_chal, "image_base64": b64_img}
                        try:
                            resp = requests.post(f"{API_URL}/challenge/verify_step", json=payload, timeout=10)
                            if resp.status_code == 200:
                                res_data = resp.json()
                                st.session_state.step_results[curr_idx] = True
                                st.session_state.motion_step += 1
                                st.success(f"✅ {current_chal} Passed! ({res_data['detail']})")
                                if "angles" in res_data:
                                    a = res_data["angles"]
                                    st.json({"Pitch (Up/Down)": f"{a.get('pitch', 0):.1f}°", "Yaw (Left/Right)": f"{a.get('yaw', 0):.1f}°", "Roll (Tilt)": f"{a.get('roll', 0):.1f}°"})
                                time.sleep(1)
                                st.rerun()
                            else:
                                detail = resp.json().get('detail', 'Failed') if resp.headers.get('content-type') == 'application/json' else resp.text
                                st.error(f"❌ {detail}")
                        except Exception as e:
                            st.error(f"Connection error: {e}")
    else:
        st.balloons()
        st.success("🎉 **ALL 3D MOTION CHALLENGES PASSED!** Identity & Live Presence Verified.")
        st.session_state.liveness_verified = True
