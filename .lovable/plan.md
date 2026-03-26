

## Add Status Timeline to AgreementDetail.tsx

### Single Change
Insert the status timeline JSX block between **line 455** (end of client info grid `</div>`) and **line 457** (Scope comment). No new imports, no other modifications.

The timeline renders 3 milestone circles (Created, Sent, Signed) connected by horizontal lines, with green fill for completed steps and muted styling for pending ones. Dates display beneath each completed step.

### Insertion Point
- **After line 455**: `</div>` (closing the client info grid)
- **Before line 457**: `{/* Scope */}`

Paste the exact JSX provided by the user between these two lines.

