# SOP generator

`build_sop.py` produces the Standard Operating Procedure PDF that the app links from the
sidebar ("SOP / Help"). It writes `public/docs/Eagle-Manpower-Lookahead-SOP.pdf` on the
Eagle Controls letterhead (`letterhead-logo.png`, the lockup extracted from the company
letterhead at 876x340 px).

To revise it:

1. Edit the text in `build_sop.py` and bump `REV` / `REV_NOTE`.
2. Build and run it:

       python -m pip install reportlab
       python tools/sop/build_sop.py

3. Deploy hosting (`firebase deploy --only hosting`) so the new PDF goes live.

The PDF uses the built-in Helvetica font, so stick to characters it can print: no emoji
or arrow glyphs. Use `->` and quoted badge names (e.g. "Tracker wants here") instead.
