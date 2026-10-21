"""Builds the legal documents review PDF from web/src/content/legal/*.json.

    python3 scripts/legal-pdf.py <out.pdf> <wordmark.png>

The website renders the same files, so the PDF matches the site word for word.
For the refund policy it uses refunds.proposed.json when there is one.
"""
import html
import json
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, Image, KeepTogether, ListFlowable, ListItem, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)

OUT, LOGO = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "web/src/content/legal")
FONTS = os.path.join(ROOT, "node_modules/@expo-google-fonts/")
pdfmetrics.registerFont(TTFont("Mont", FONTS + "montserrat/700Bold/Montserrat_700Bold.ttf"))
pdfmetrics.registerFont(TTFont("Inter", FONTS + "inter/400Regular/Inter_400Regular.ttf"))
pdfmetrics.registerFont(TTFont("InterSB", FONTS + "inter/600SemiBold/Inter_600SemiBold.ttf"))
pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="InterSB", italic="Inter", boldItalic="InterSB")

FOREST, LIME, TINT = colors.HexColor("#1E3B16"), colors.HexColor("#A9D654"), colors.HexColor("#F2F8E6")
INK, MUTED, LINE = colors.HexColor("#1A1A1A"), colors.HexColor("#555B52"), colors.HexColor("#DFDFDF")
PEND, PEND_BG = colors.HexColor("#8A5A0B"), colors.HexColor("#FDF3E2")

h1 = ParagraphStyle("h1", fontName="Mont", fontSize=22, leading=28, textColor=FOREST)
h2 = ParagraphStyle("h2", fontName="Mont", fontSize=12.5, leading=17, textColor=FOREST, spaceBefore=10, spaceAfter=2)
body = ParagraphStyle("body", fontName="Inter", fontSize=9.5, leading=14.5, textColor=INK, spaceAfter=4)
muted = ParagraphStyle("muted", parent=body, textColor=MUTED)
small = ParagraphStyle("small", parent=body, fontSize=8, leading=11, textColor=MUTED, spaceAfter=0)
note = ParagraphStyle("note", parent=body, textColor=PEND)
W, H = A4
M = 18 * mm
CW = W - 2 * M

DOCS = [("terms", "Terms of use"), ("privacy", "Privacy policy"), ("refunds", "Refund and dispute policy"),
        ("farmer-terms", "Farmer terms"), ("cookies", "Cookie policy")]


def mark(text):
    """**bold** and [label](href) to reportlab markup; [placeholders] highlighted."""
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<link href="{m.group(2) if not m.group(2).startswith("/") else "https://farmkeke.com" + m.group(2)}" color="#1E3B16"><u>{m.group(1)}</u></link>', out)
    return re.sub(r"\[([^\]]+)\]", r'<font backColor="#FDF3E2" color="#8A5A0B">[\1]</font>', out)


def box(flowables, bg=TINT):
    t = Table([[flowables]], colWidths=[CW])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("LEFTPADDING", (0, 0), (-1, -1), 10),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ROUNDEDCORNERS", [6, 6, 6, 6])]))
    return t


class Field(Flowable):
    def __init__(self, name, height=9 * mm, width=None):
        super().__init__()
        self.name, self.height, self.fw = name, height, width

    def wrap(self, aw, ah):
        self.width = self.fw or aw
        return self.width, self.height

    def draw(self):
        self.canv.acroForm.textfield(name=self.name, x=0, y=0, width=self.width, height=self.height, relative=True,
                                     fieldFlags="multiline", fontName="Helvetica", fontSize=9, borderWidth=0.8,
                                     borderColor=LIME, fillColor=colors.white, textColor=INK, forceBorder=True)


class Check(Flowable):
    def __init__(self, name):
        super().__init__()
        self.name = name

    def wrap(self, aw, ah):
        return 12, 12

    def draw(self):
        self.canv.acroForm.checkbox(name=self.name, x=0, y=0, size=11, relative=True, borderColor=FOREST,
                                    fillColor=colors.white, buttonStyle="check", forceBorder=True)


def signoff(key, label):
    row = lambda c, t: [Check(f"{key}_{c}"), Paragraph(t, body)]
    t = Table([row("approved", "Approved as written"), row("changes", "Approved with the changes below")],
              colWidths=[16, CW - 16])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    sig = Table([[Paragraph("Name", small), Paragraph("Date", small)], [Field(f"{key}_name"), Field(f"{key}_date")]],
                colWidths=[CW * 0.62, CW * 0.38])
    sig.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (0, -1), 8)]))
    return KeepTogether([Spacer(1, 10), Paragraph(f"Sign-off: {label}", h2), t, Spacer(1, 4),
                         Paragraph("Changes or comments", small), Field(f"{key}_comments", 30 * mm), Spacer(1, 6), sig])


def blocks(bs):
    out = []
    for b in bs:
        if "p" in b:
            out.append(Paragraph(mark(b["p"]), body))
        else:
            out.append(ListFlowable([ListItem(Paragraph(mark(i), body), leftIndent=12, bulletColor=FOREST) for i in b["ul"]],
                                    bulletType="bullet", start="•", leftIndent=12, bulletFontSize=9))
    return out


def on_page(c, d):
    c.saveState()
    c.setFont("Inter", 7.5)
    c.setFillColor(MUTED)
    c.drawString(M, 10 * mm, "Farmkeke legal documents: draft for approval")
    c.drawRightString(W - M, 10 * mm, f"Page {d.page}")
    c.restoreState()


def load(key):
    proposed = os.path.join(CONTENT, f"{key}.proposed.json")
    path = proposed if os.path.exists(proposed) else os.path.join(CONTENT, f"{key}.json")
    return json.load(open(path)), path.endswith(".proposed.json")


story = [Image(LOGO, width=34 * mm, height=34 * mm * 0.21, hAlign="LEFT"), Spacer(1, 14),
         Paragraph("Legal documents for approval", h1), Spacer(1, 4),
         Paragraph("Terms of use, Privacy policy, Refund and dispute policy, Farmer terms and Cookie policy. Drafted "
                   "21 October 2026 from how the Farmkeke website, app and Admin Portal actually work.", muted), Spacer(1, 10)]
story += [box([Paragraph("<b>How to use this document</b>", body), *blocks([{"ul": [
    "Fill in the highlighted [placeholders] on the next page: company name, RC number, address and the privacy contact.",
    "Read each document, tick a box at the end, and write any changes you want. Then send it back.",
    "The four new documents are already on the website, marked “Draft, not yet in force”. Once you approve them, we "
    "remove the draft notice and they take effect. The refund policy already in force keeps its current wording until "
    "you approve the proposed version in this pack.",
    "These drafts are a strong starting point, not legal advice. Please have a Nigerian lawyer review them before they take "
    "effect, especially the Privacy policy (Nigeria Data Protection Act 2023) and the liability sections."]}])])]
story.append(PageBreak())

story += [Paragraph("Details to fill in", h1), Spacer(1, 6)]
for name, help_ in [
    ("Company legal name", "As registered with the Corporate Affairs Commission."),
    ("RC number", "The CAC registration number."),
    ("Registered address", "The company's registered office."),
    ("Data Protection Officer", "Name of the person responsible for data protection (NDPA 2023, section 32)."),
    ("Privacy email", "We used privacy@farmkeke.com. Confirm it exists and who reads it, or give another address."),
]:
    story += [Paragraph(f"<b>{name}</b>", body), Paragraph(help_, small), Spacer(1, 2), Field(f"fill_{name}"), Spacer(1, 6)]

story += [Spacer(1, 6), Paragraph("Decisions we made for you (change any you disagree with)", h2), *blocks([{"ul": [
    "**Minimum age 18** for shoppers (or with a parent's permission) and for farmers. The app doesn't check age yet.",
    "**How long we keep information:** orders and payments 6 years (tax and accounting); messages, problem reports and "
    "support chats 2 years; farmer documents while selling plus 2 years (1 year if rejected); riders while active plus 2 "
    "years; text message logs 1 year.",
    "**Notice before changes:** 30 days before a commission change, 14 days before other important changes to the farmer terms.",
    "**Disputes:** talk to us first, then mediation, then the courts of Nigeria, under Nigerian law.",
    "**Payment if a shopper never confirms:** after 24 hours we remind them, and staff may release payment after checking "
    "delivery records. This matches how the Admin Portal works today (there is no automatic release)."]}])]

story += [Paragraph("Things the app should do to match these documents", h2), *blocks([{"ul": [
    "**Automatic deletion:** the retention periods above are not automated yet. Nothing is deleted on a schedule today. We "
    "can build scheduled clean-up once you approve the periods.",
    "**Suspended farms:** the Farmer terms say a suspended farm can still finish open orders and gets paid for completed ones. "
    "Please confirm this is the rule your team will follow.",
    "**Uncollected pickup orders** (proposed refund policy): support arranges a later collection or decides on a refund. "
    "This is a support process, not an automatic one.",
    "**Age:** if you want 18+ enforced, we can add a confirmation tick at sign-up and in the farmer application."]}])]
story.append(PageBreak())

for i, (key, label) in enumerate(DOCS):
    doc, proposed = load(key)
    story += [Paragraph(f"{i + 1}. {doc['title']}", h1), Spacer(1, 2)]
    if proposed:
        story += [Paragraph("Proposed new version. The version on the website today (approved 17 October 2026) stays in "
                            "force until you approve this one. New in this version: the delivery fee is refunded with a full "
                            "refund; up to 6 photos; the 24-hour reminder and staff release; a section on uncollected pickup "
                            "orders; asking us to look again at a decision; and your rights under the FCCPA.", note)]
    else:
        story += [Paragraph(f"Draft, {doc['updated']}. On the website now, marked “Draft, not yet in force”.", small)]
    story += [Spacer(1, 6), box([Paragraph(mark(doc["short"]), body)])]
    for n, s in enumerate(doc["sections"], 1):
        story += [KeepTogether([Paragraph(f"{n}. {html.escape(s['title'])}", h2), *blocks(s["blocks"][:1])]), *blocks(s["blocks"][1:])]
    story += [signoff(key, doc["title"])]
    if i < len(DOCS) - 1:
        story.append(PageBreak())

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=16 * mm, bottomMargin=18 * mm,
                      title="Farmkeke legal documents for approval", author="Farmkeke")
doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(M, 18 * mm, CW, H - 34 * mm, id="f")], onPage=on_page)])
doc.build(story)
print("wrote", OUT)
