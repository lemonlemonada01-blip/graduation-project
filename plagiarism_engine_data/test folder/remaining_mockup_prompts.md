# Remaining UI Mockup Prompts (Pages 14-18)

Please copy and paste these prompts individually into the image generator, then save the resulting images in this folder (`D:\Graduation Project\UI_Mockups`).

---

## Page 14: Face Attendance — Supervisor Meeting Management View (Dark Mode)
```text
Design a dark mode meeting management page for supervisors in "Secure-FEPRH".

Same sidebar + header layout. "Attendance" nav item active.

Content area:
- Top bar: Title "Meeting Management" on the left, "+ Create Meeting" button on the right in indigo gradient.
- Meetings table (slate-800 card, rounded-2xl):
  - Columns: Date | Project | Notes | Attendance | Actions.
  - Show 4 sample rows:
    - "Jul 18, 2025" | "AI-Powered Attendance System" | "Weekly progress review" | "4/5 verified" (green badge) | Expand button.
    - "Jul 11, 2025" | "AI-Powered Attendance System" | "Sprint planning" | "5/5 verified" (green) | Expand.
    - "Jul 4, 2025" | "Cybersecurity Audit Tool" | "Initial briefing" | "3/4 verified" (yellow) | Expand.
    - "Jun 27, 2025" | "AI-Powered Attendance System" | "Requirements review" | "2/5 verified" (red) | Expand.
  - One row expanded showing an attendance details sub-table:
    - Sub-columns: Student Name | Verification | Timestamp.
    - Show 5 students. 4 have green "✓ Face Verified" badge with timestamps. 1 has red "✗ Not Verified" badge.

No device frames. Dark mode. Font: Inter.
```

---

## Page 15: User Management (Dark Mode)
```text
Design a dark mode user management admin page for "Secure-FEPRH".

Same sidebar + header layout. Navigation should show an additional "User Management" item with a users icon, shown as active.

Content area:
- Top bar: Search input on the left (dark, rounded-xl, magnifying glass icon), Role filter dropdown next to it, and "+ Add User" button on the right in indigo gradient.
- Users table (slate-800 card, rounded-2xl, full width):
  - Columns: Name | Email | Role | Department | University | Status | Actions.
  - Show 6 sample rows with realistic data:
    - Mix of roles: ministry_admin, university_admin, supervisor, student.
    - Role badges are color-coded pills (ministry=indigo, university=blue, supervisor=green, student=gray).
    - Status column: "Active" green dot or "Inactive" gray dot.
    - Actions: Edit (pencil icon button) and Toggle status (switch/toggle).
  - Use Arabic-sounding names for the users.
- Show pagination at the bottom: "Showing 1-6 of 234 users" with page number buttons.

No device frames. Dark mode. Font: Inter.
```

---

## Page 16: User Profile & Settings (Dark Mode)
```text
Design a dark mode user profile and settings page for "Secure-FEPRH".

Same sidebar + header layout.

Content area:
- Top: A profile card (slate-800, rounded-2xl) centered:
  - Left side: Large avatar circle (64px, indigo gradient background with white initials "AH").
  - Right of avatar: Name "Dr. Ahmed Hassan" in white 20px bold. Below: email "ahmed.hassan@cairo.edu" in gray-400. Below that: Role badge "SUPERVISOR" in a green pill. Below that: breadcrumb text "Cairo University → Faculty of Engineering → Computer Science" in gray-500.
  - Far right: "Edit Profile" button in gray outline style.

- Below, a 2-column grid of settings cards:
  - Card 1: "Change Password" (slate-800, rounded-2xl). Three input fields: Current Password, New Password, Confirm Password. "Update Password" button in indigo.
  - Card 2: "Face Biometric" (slate-800, rounded-2xl). Status: "Not Enrolled" with a yellow warning icon. A small webcam preview placeholder (dark square, rounded-xl). "Capture Face Encoding" button below it.
  - Card 3: "Appearance" (slate-800, rounded-2xl). Three options as selectable cards: "Dark" (moon icon, selected with indigo border), "Light" (sun icon), "System" (monitor icon).
  - Card 4: "Notifications" (slate-800, rounded-2xl). Toggle switches: "Plagiarism Alerts" (on), "Meeting Reminders" (on), "Project Updates" (off). Each toggle has a label and description text.

No device frames. Dark mode. Font: Inter.
```

---

## Page 17: 404 Not Found Page (Dark Mode)
```text
Design a dark mode 404 error page for "Secure-FEPRH".

Full screen, dark gradient background (slate-900 to slate-800).

Centered content:
- Very large "404" text in bold, using a subtle indigo gradient on the text, approximately 120px font size.
- Below: "Page Not Found" in white 24px.
- Below: "The page you are looking for does not exist or has been moved." in gray-400 16px.
- Below: "Back to Dashboard" button in indigo-to-blue gradient, rounded-xl, with a left arrow icon.
- A subtle shield icon watermark behind the 404 text at low opacity.

Minimal, clean, premium. No device frames. Dark mode. Font: Inter.
```

---

## Page 18: Loading / Splash Screen (Dark Mode)
```text
Design a dark mode loading splash screen for "Secure-FEPRH".

Full screen, deep dark background (slate-900).

Centered content:
- A shield checkmark icon (64px) with a subtle pulsing indigo glow animation effect around it.
- Below the icon: "Secure-FEPRH" in white bold 28px.
- Below that: "National Command Center" in gray-500 14px.
- Below that: A thin horizontal loading progress bar (200px wide, rounded-full, indigo gradient fill at about 60%).

Very minimal and clean. No device frames. Font: Inter.
```
