# -*- coding: utf-8 -*-
# Eagle Manpower Lookahead - Standard Operating Procedure, Rev 3.0
# Builds public/docs/Eagle-Manpower-Lookahead-SOP.pdf (linked from the app sidebar). See README.md.
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, HRFlowable, Table, TableStyle, KeepTogether
from reportlab.pdfgen import canvas as canvas_mod

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(HERE, "letterhead-logo.png")
OUT_PATH = os.path.normpath(os.path.join(HERE, "..", "..", "public", "docs", "Eagle-Manpower-Lookahead-SOP.pdf"))
REV = "Rev 3.3"
REV_NOTE = "hours within a day (part days, several jobs, overtime), roles (incl. view-only Member and Scheduler), display names, protected admin account, multiple planning roles, Service vs. Projects, manpower requests, activity log, PCC integration"

LEFT_MARGIN = 0.75 * inch
RIGHT_MARGIN = 0.75 * inch
TOP_MARGIN = 1.55 * inch
BOTTOM_MARGIN = 0.75 * inch
PAGE_W, PAGE_H = letter

GRAY = colors.HexColor("#8a8a8a")
DARKGRAY = colors.HexColor("#404040")
BLACK = colors.HexColor("#1a1a1a")
LIGHT = colors.HexColor("#f2f2f2")

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=BLACK, spaceAfter=1),
    "section": ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=12.5, leading=15, textColor=BLACK, spaceBefore=10, spaceAfter=6),
    "subsection": ParagraphStyle("subsection", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=BLACK, spaceBefore=10, spaceAfter=3),
    "subhead": ParagraphStyle("subhead", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLACK, spaceBefore=4, spaceAfter=2),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.5, textColor=DARKGRAY, spaceAfter=3),
    "bullet1": ParagraphStyle("bullet1", fontName="Helvetica", fontSize=10, leading=13.5, textColor=DARKGRAY, leftIndent=18, bulletIndent=6, spaceAfter=1),
    "bullet2": ParagraphStyle("bullet2", fontName="Helvetica", fontSize=10, leading=13.5, textColor=DARKGRAY, leftIndent=38, bulletIndent=26, spaceAfter=1),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9, leading=11.5, textColor=DARKGRAY),
    "cellhead": ParagraphStyle("cellhead", fontName="Helvetica-Bold", fontSize=9, leading=11.5, textColor=BLACK),
    "footer": ParagraphStyle("footer", fontName="Helvetica", fontSize=8, leading=10, textColor=GRAY),
}


def P(text, style="body"):
    return Paragraph(text, styles[style])


def B1(text):
    return Paragraph(u"\u2022 " + text, styles["bullet1"])


def B2(text):
    return Paragraph(u"o " + text, styles["bullet2"])


def rule():
    return HRFlowable(width="100%", thickness=0.75, color=GRAY, spaceBefore=8, spaceAfter=10)


def section(num, title):
    return P(str(num) + ". " + title, "section")


def subsection(num, title):
    return P(num + " " + title, "subsection")


def block(objective, actions, deliverable):
    flow = [P("<b>Objective:</b> " + objective, "body")]
    flow.append(P("<b>Actions:</b>", "subhead"))
    for a in actions:
        if isinstance(a, tuple):
            flow.append(B1(a[0]))
            for sub in a[1]:
                flow.append(B2(sub))
        else:
            flow.append(B1(a))
    flow.append(P("<b>Deliverable:</b> " + deliverable, "body"))
    return flow


def table(headers, rows, widths):
    data = [[Paragraph(h, styles["cellhead"]) for h in headers]]
    for r in rows:
        data.append([Paragraph(c, styles["cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, GRAY),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#d9d9d9")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


story = []

# ---- Title block ----
story.append(P("Standard Operating Procedure (SOP)", "title"))
story.append(P("Eagle Manpower Lookahead \u2013 Workforce Scheduling &amp; PM Demand Planning", "title"))
story.append(P(REV + " \u2013 " + REV_NOTE, "body"))
story.append(rule())

# ---- 1. Purpose ----
story.append(section(1, "Purpose"))
story.append(P(
    "To establish a consistent, accurate, and repeatable process for using the Eagle Manpower Lookahead "
    "application to plan, assign, and track staff across active and upcoming projects \u2013 ensuring accurate "
    "utilization, timely PM demand planning, controlled access by role and branch, a clear path for borrowing "
    "people between branches, a complete record of who changed what, and safe handling of schedule data "
    "shared with the Project Command Center.",
    "body",
))
story.append(rule())

# ---- 2. Scope ----
story.append(section(2, "Scope"))
story.append(P("This SOP applies to all activities performed within the Eagle Manpower Lookahead application, including:", "body"))
for t in ["Daily and weekly staff scheduling",
          "Project, overhead, roster, and user administration (roles, branches, project managers)",
          "PM demand planning and coverage tracking",
          "Manpower requests between branches",
          "Reviewing schedule data synced from the Project Command Center",
          "Alerts, reporting, the activity log, and data backup"]:
    story.append(B1(t))
story.append(rule())

# ---- 3. Roles & Responsibilities ----
story.append(section(3, "Roles &amp; Responsibilities"))
story.append(P(
    "Every account carries a set of roles (any combination), set by an administrator under Administration &gt; Users, "
    "and optionally a branch. Together these decide what a user sees and what they may change. An account with no "
    "role at all is a view-only Member.",
    "body",
))
story.append(table(
    ["Role", "What they do", "What the system allows"],
    [
        ["Member (no role)",
         "Views the board, PM demand, requests and activity \u2013 the right setting for technicians checking their own schedule.",
         "Read-only everywhere. Cannot assign, note, plan demand or send requests; the board header shows View only."],
        ["Scheduler",
         "Day-to-day scheduling on the Manpower Board; dispatch notes; PM demand for shared projects and projects in their branch.",
         "Edits people and projects in their own branch. With no branch set (\u201cAll branches\u201d) they may edit every branch."],
        ["Project Manager (PM)",
         "Enters and maintains PM demand plans for the projects assigned to them; confirms or edits PCC demand drafts.",
         "PM Demand shows only their assigned projects. Scheduling rights are the same as a Scheduler."],
        ["Branch Coordinator",
         "Everything a Scheduler does, plus answers manpower requests from other branches for people in their branch.",
         "Must have a branch set. Approve / Decline on the Requests page for that branch."],
        ["Administrator",
         "Owns the roster, projects, overhead, staffing roles, users, roles and branches, project-to-PM assignment, backups and restores.",
         "Administration page; unrestricted editing; may answer any request."],
    ],
    [1.25 * inch, 2.9 * inch, 2.85 * inch],
))
story.append(P("", "body"))
story.append(P("Shared duties for every role", "subhead"))
for t in ["Keep assignments current for the weeks you are responsible for",
          "Review Alerts and the Project Command Center conflict badges for your area",
          "Use manpower requests \u2013 not workarounds \u2013 when you need someone from another branch",
          "Export a JSON backup on the agreed cadence (see 4.13)"]:
    story.append(B1(t))
story.append(rule())

# ---- 4. Procedure ----
story.append(section(4, "Procedure"))
story.append(rule())

story.append(subsection("4.1", "Login &amp; Dashboard Review"))
story.extend(block(
    "Confirm system access and review current staffing health before making changes.",
    [
        "Sign in with your Eagle Manpower Lookahead credentials (sign-ins and sign-outs are recorded in the activity log)",
        ("Review the Dashboard:", [
            "Company utilization, at-capacity, and under-assigned counts",
            "Total PM demand and unstaffed demand hours",
            "Needs Attention list and 4-week capacity pressure",
        ]),
        "Check the Requests item in the sidebar \u2013 a number next to it means something is waiting on you",
        "Note any items requiring immediate action",
    ],
    "Confirmed awareness of current staffing status",
))

story.append(subsection("4.2", "User Administration (Administrators)"))
story.extend(block(
    "Give each account the right role and branch so people see and change only what they should.",
    [
        ("Under Administration &gt; Users:", [
            "Everyone who has signed in appears automatically; to set someone up before their first sign-in, enter their email in Add by email",
            "Enter a display Name in the field beside the email – it replaces the email on requests, the activity log and the sidebar",
            "Toggle roles with the Scheduler / PM / Coordinator / Admin pills – they combine; Member (none on) is view-only, which is what technicians should have",
            "Set the Branch from the dropdown; All branches means unrestricted editing",
            "A Coordinator must have a branch, or requests for that branch will only reach administrators",
        ]),
        "Remove an account from the list if it should no longer carry a role or branch (the login itself is managed in Firebase Authentication)",
        ("The account marked Protected is the permanent safety net:", [
            "Its roles, branch and name cannot be changed or removed from the app, by anyone – so an administrator can never lock everyone out",
            "Keep its password somewhere safe; use it only to repair access if the other administrators are lost",
        ]),
        "Keep at least one Coordinator per branch and more than one Administrator; you may change your own roles, except removing Admin from yourself while you are the only administrator",
    ],
    "Every user listed with the correct role and branch",
))

story.append(subsection("4.3", "Roster, Project &amp; Overhead Setup (Administrators)"))
story.extend(block(
    "Keep the underlying roster and job data current before scheduling.",
    [
        ("Under Administration &gt; Roster:", [
            "Add, update, or remove personnel and their office / job title / skills",
            "A person\u2019s office is the branch that controls their schedule",
            "Switch on every planning role a person can fill (the pills on their row) \u2013 the first one on is their primary; PM demand coverage counts them toward whichever of their roles a plan still needs",
            "Maintain the Staffing Roles used for PM demand planning",
        ]),
        ("Under Administration &gt; Projects:", [
            "Add new jobs, set the office (blank = shared across all offices), and tag required skills",
            "Mark service work (service calls, training, standing service items) as Service with the Project / Service toggle \u2013 it then sits in its own section here and on PM Demand",
            "Choose the Project Manager from the dropdown \u2013 a user with the PM role only sees the projects assigned to them on PM Demand",
        ]),
        ("Under Administration &gt; Overhead:", [
            "Maintain non-project categories (PTO, Office, Remote, Sales, Holiday)",
        ]),
    ],
    "Up-to-date roster, project, overhead, and project-manager records",
))

story.append(subsection("4.4", "Staff Assignment (Manpower Board)"))
story.extend(block(
    "Assign people to jobs or overhead for the correct days and weeks.",
    [
        "Select the People, Projects, or Heatmap view, and set the office/job filters and horizon (1\u201312 weeks)",
        "Each person shows two utilization pills: project / job work, and office / overhead time",
        "Click an empty or existing day cell to open the assignment editor",
        "Use the Apply To day pills to assign one day or several days at once within that week",
        ("Pick the hours, then the job or overhead:", [
            "Full day (the default) makes the day that job – the way the board has always worked",
            "Half day, 2h, or any number typed in the Other box adds that job alongside whatever is already on the day, e.g. a tech on half days Mon / Wed / Fri, or 2h of a service call in a project day",
            "A day can hold several jobs; the editor lists them with editable hour boxes and a remove button each, and shows the day’s total",
            "Overtime is allowed – a day over 8h shows the extra hours in amber on the board and in the editor",
        ]),
        ("Reading a split day on the board:", [
            "One chip per job, sharing the cell equally; each chip carries its hours (“Project Faraday 4h”); hover for the full breakdown",
            "Utilization pills, PM demand coverage, the dashboard, reports and the crew message all count real hours, so a half day counts as 4h",
        ]),
        "Use the Job Tray (Show/Hide Job Tray) to drag jobs or overhead directly onto a day (a full day, replacing what is there)",
        "Drag a chip onto another day to move just that job’s hours there (it joins whatever is on the target day); two plain full days swap when one is dropped on the other",
        "Drag a chip onto the Drop here to clear bar along the bottom of the screen to take that job off that day (Ctrl+Z undoes the last clear)",
        ("Double-click a day (or a merged multi-day block) to add a dispatch note:", [
            "Each joined day gets its own note box \u2013 a 3-day block can carry three different notes",
            "Every day with a note shows its own preview line on the chip (tagged by day when they differ)",
        ]),
        ("If your account is assigned to a branch:", [
            "The page header shows Editing &lt;branch&gt; only; people in other branches are marked read-only and their cells are dimmed",
            "You cannot assign, note, or drag onto those people \u2013 clicking one of their days opens a manpower request instead (see 4.7)",
        ]),
    ],
    "Accurate day-by-day staffing on the Manpower Board, with dispatch notes attached where needed",
))

story.append(subsection("4.5", "Weekly Navigation"))
story.extend(block(
    "Review or adjust staffing for a specific past or future week without changing the horizon view.",
    [
        "Switch the board to the 1-week view",
        "Use \u2039 Prev / Today / Next \u203a to step to the week needed",
        "Make or review assignments as described in 4.4",
    ],
    "Correct staffing for the targeted week",
))

story.append(subsection("4.6", "PM Demand Planning"))
story.extend(block(
    "Capture each project\u2019s PM-requested staffing needs by week and role.",
    [
        "Open PM Demand from the sidebar, or click a project name / week cell from the board",
        "Projects are listed first; jobs marked as Service sit in their own section underneath",
        "Users with the PM role see only their assigned projects (the subtitle reads Showing your projects); everyone else sees all projects for the selected office",
        "For the active week, assign a PM / demand owner and set status (Draft or Confirmed)",
        "Add one role requirement row per need, with headcount and hours per person",
        "Record notes or assumptions, then Save PM Demand",
        "Review the coverage meter and role-gap indicators; clear a week if no longer needed",
        ("Limits to be aware of:", [
            "A project that belongs to another branch opens read-only (banner at the top) unless it is shared or you are its Project Manager",
            "Project skill requirements are changed by administrators only",
        ]),
    ],
    "Current, role-based PM demand plan for each project and week",
))

story.append(subsection("4.7", "Manpower Requests (Borrowing People Between Branches)"))
story.extend(block(
    "Ask another branch for one of their people, and let that branch\u2019s coordinator decide and apply the change in one step.",
    [
        ("To ask (any user with a branch):", [
            "On the Manpower Board, click a day of the person you need \u2013 their cells are marked read-only",
            "Pick the days, the job you need them on (only jobs you could schedule yourself are offered), and write a short message",
            "The form names the coordinator who will receive it; Send request",
            "The requested days show a Requested badge on the board for everyone until the request is answered",
        ]),
        ("To answer (Branch Coordinator of that branch, or an Administrator):", [
            "Open Requests from the sidebar \u2013 the Needs my action tab lists what is waiting on you; a toast also appears when a new request arrives while the app is open",
            "Review the message, what those days currently hold, and reply if you need more information",
            "Approve &amp; move: confirms, moves those days to the requested job on the board, and records the outcome in the request thread",
            "Decline: optionally give a reason; nothing on the board changes",
        ]),
        "The requester can Withdraw an open request and sees the outcome under My requests",
        "If the form warns that a branch has no coordinator, ask an administrator to assign one (see 4.2)",
    ],
    "Cross-branch staffing changes made through an approved request, with the decision recorded",
))

story.append(subsection("4.8", "Project Command Center (PCC) Schedule Sync"))
story.extend(block(
    "Review and act on schedule data the Project Command Center writes into the board automatically.",
    [
        ("Recognize PCC-sourced items on the board:", [
            "A dashed chip with a \u201cTracker\u201d badge \u2013 PCC placed that person there from the project schedule",
            "An amber chip with a \u201cTracker wants here\u201d badge \u2013 PCC wanted them there, but the day was already booked by hand; PCC leaves the hand-booked entry alone",
        ]),
        ("Recognize PCC-sourced PM demand:", [
            "A PM demand week shows a \u201cPCC draft\u201d badge and banner until a PM edits or confirms it",
            "Once edited or confirmed, the banner changes to PCC \u00b7 edited / confirmed and PCC stops updating that week",
        ]),
        "Review any conflict badges and confirm the hand-booked entry is still correct",
        "Confirm or adjust PCC-sourced demand drafts the same way as any other PM demand entry (see 4.6)",
    ],
    "PCC-sourced schedule and demand data reviewed and, where needed, confirmed or corrected",
))

story.append(subsection("4.9", "Alerts &amp; Conflict Resolution"))
story.extend(block(
    "Identify and resolve staffing risks before they affect delivery.",
    [
        "Review the Alerts page for over/under-utilized people and projects needing a plan or more hours",
        "Open the related employee or PM demand record directly from an alert",
        "Reassign staff or adjust the PM demand plan to close the gap \u2013 or raise a manpower request if the people you need are in another branch",
    ],
    "Reduced open alerts and documented resolutions",
))

story.append(subsection("4.10", "Ops Intelligence &amp; Scenario Planning"))
story.extend(block(
    "Assess longer-range capacity pressure and model staffing changes before committing them.",
    [
        "Review the 12-week forecast, Action Center, Project Health, and Role Pressure panels",
        "Use the Scenario Lab to model surges, absences, or shifted demand without affecting live data",
    ],
    "Informed, forward-looking staffing decisions",
))

story.append(subsection("4.11", "Reporting, Exports &amp; Crew Communication"))
story.extend(block(
    "Share accurate staffing and demand information with stakeholders.",
    [
        "From Reports, export the weekly CSV, print/export to PDF, or copy a crew message by office",
        "Review the Weekly Demand and Utilization by Office tables as needed",
    ],
    "Distributed reports and crew communications",
))

story.append(subsection("4.12", "Activity Log"))
story.extend(block(
    "Know who changed what, and when. Every change made through the application is recorded automatically.",
    [
        ("What is recorded (with the user and time):", [
            "Schedule changes, written out per person and day, e.g. \u201cA. Smith \u00b7 Tue Oct 20 \u2013 Wed Oct 21: free -> C11396 Project Faraday\u201d",
            "Dispatch notes added, changed, or removed; PM demand saved or cleared",
            "Roster, project, overhead, staffing-role, and holiday edits; user role and branch changes",
            "Manpower requests sent, approved, declined, or withdrawn; sign-ins and sign-outs",
        ]),
        "Open Activity from the sidebar; filter by area, time range, user, or search text; Export CSV for a record outside the app",
        "Entries cannot be edited or deleted by anyone, and are kept for one year",
        "A board change is only accepted by the system when it carries its activity entry, so nothing on the board changes without a record of who did it",
        "Use the log to answer \u201cwho moved this person?\u201d before changing it back, and to review access changes after staffing turnover",
    ],
    "A complete, searchable history of changes, available to every user",
))

story.append(subsection("4.13", "Data Backup &amp; Recovery"))
story.extend(block(
    "Protect scheduling data against loss or error. A full-board deletion has happened before and was only "
    "recoverable because a recent JSON backup existed \u2013 treat this step as mandatory, not optional.",
    [
        "From Reports, export a JSON backup on a regular cadence (daily during active use; weekly at minimum)",
        "Store the backup file in an approved, shared location \u2013 not only on one person\u2019s machine",
        ("If the board ever shows \u201cNo board data found\u201d:", [
            "Do not click Create new empty board \u2013 that is for first-time setup only",
            "Contact an administrator immediately and restore from the most recent JSON backup",
            "Check the Activity log to establish what happened and when",
        ]),
        "If a routine restore is needed, use Restore Backup and confirm the replacement before proceeding (administrators only)",
    ],
    "A current backup file retained at all times, and a documented path to recover from data loss",
))
story.append(rule())

# ---- 5. Checklist ----
story.append(section(5, "Data Integrity &amp; Review Checklist"))
for t in [
    "Does every active project have a current-week PM demand plan and an assigned Project Manager?",
    "Are any people over 100% or under 50% utilized without explanation?",
    "Are office and role assignments accurate for all active personnel?",
    "Does every user have the correct role and branch, and does every branch have a Coordinator?",
    "Are there open manpower requests older than two business days?",
    "Have open Alerts been reviewed and addressed or documented?",
    "Have PCC conflict badges (\u201cTracker wants here\u201d) been reviewed this week?",
    "Are PCC demand drafts for active projects confirmed or intentionally left as drafts?",
    "Is the most recent JSON backup less than one week old?",
]:
    story.append(B1(t))
story.append(rule())

# ---- 6. Continuous Improvement ----
story.append(section(6, "Continuous Improvement"))
for t in [
    "Review Dashboard and Ops Intelligence trends regularly to refine staffing norms",
    "Review the Activity log periodically for unexpected changes or access that should be tightened",
    "Update Staffing Roles and overhead categories as operations evolve",
    "Incorporate feedback from Project Managers and Branch Coordinators into demand and request practices",
    "Report any PCC sync errors (visible in the Project Command Center\u2019s own sync status) to an administrator",
]:
    story.append(B1(t))
story.append(rule())

# ---- 7. Quick reference ----
story.append(section(7, "Quick Reference"))
story.append(table(
    ["I want to\u2026", "Where", "Who"],
    [
        ["Assign or clear a day", "Manpower Board -> click a day cell", "Any editing role, within their branch"],
        ["Put part of a day, or a second job, on a day", "Manpower Board -> click the day -> Half day / 2h / Other -> pick the job", "Any editing role, within their branch"],
        ["Move one job's hours to another day", "Manpower Board -> drag that chip", "Any editing role, within their branch"],
        ["Add a dispatch note", "Manpower Board -> double-click a day or block", "Any editing role, within their branch"],
        ["Borrow someone from another branch", "Manpower Board -> click their day -> Send request", "Any editing role with a branch"],
        ["Check my own schedule (read-only)", "Manpower Board / Dashboard", "Member (no role), e.g. technicians"],
        ["Answer a request", "Requests -> Needs my action", "Branch Coordinator / Administrator"],
        ["Plan PM demand", "PM Demand, or click a project on the board", "PMs (own projects), Schedulers, Coordinators, Admins"],
        ["Assign a project to a PM", "Administration -> Projects -> Project manager", "Administrator"],
        ["Mark a job as service work", "Administration -> Projects -> Project / Service toggle", "Administrator"],
        ["Give a person extra planning roles", "Administration -> Roster -> role pills", "Administrator"],
        ["Set a role, branch or display name", "Administration -> Users", "Administrator"],
        ["See who changed something", "Activity -> filter or search", "Any user"],
        ["Export or restore a backup", "Reports", "Any user (export) / Administrator (restore)"],
    ],
    [2.1 * inch, 2.85 * inch, 2.05 * inch],
))


def draw_letterhead(c: canvas_mod.Canvas, doc):
    c.saveState()
    logo_w = 2.1 * inch
    logo_h = logo_w * (340.0 / 876.0)  # aspect ratio of the extracted lockup (876x340 px)
    x = LEFT_MARGIN
    y = PAGE_H - 0.55 * inch - logo_h
    c.drawImage(LOGO_PATH, x, y, width=logo_w, height=logo_h, mask="auto", preserveAspectRatio=True)
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawRightString(PAGE_W - RIGHT_MARGIN, 0.5 * inch, "Eagle Manpower Lookahead SOP \u00b7 " + REV + " \u00b7 Page " + str(doc.page))
    c.restoreState()


doc = SimpleDocTemplate(
    OUT_PATH,
    pagesize=letter,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title="Eagle Manpower Lookahead SOP " + REV,
    author="Eagle Controls",
)

doc.build(story, onFirstPage=draw_letterhead, onLaterPages=draw_letterhead)
print("done:", OUT_PATH)
