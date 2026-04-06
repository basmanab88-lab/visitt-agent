# LOCKED — Templates Directory

The following files in this directory are LOCKED and may only be modified
when the user is **basman@visitt.io** AND explicitly requests a change:

- `building-preview.jsx` — Standard building deploy preview component

## Why locked?
This template defines the mandatory, consistent visual preview shown before
every building deploy under My Property. Consistency is the entire point —
the preview must look and behave identically every time, across all sessions.

## How to modify (owner only)
Only basman@visitt.io may request changes. When he does:
1. Make the requested change to building-preview.jsx
2. Update the version comment at the top of the file
3. Commit with message: "template(locked): [change description] — requested by basman@visitt.io"

## What IS allowed without owner permission
- Reading and copying the template for use in a session
- Populating the INIT block with session-specific data (customerName, propertyName, floors, etc.)
- NOT pushing those session-specific changes back to GitHub
