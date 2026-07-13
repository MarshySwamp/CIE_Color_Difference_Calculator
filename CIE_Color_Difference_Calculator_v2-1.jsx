/*
    Calculates the CIE colour difference (dE76 / dE94 / dE2000) between either:

      - the Foreground and Background colors
        or
      - Color Sampler 1 and Color Sampler 2 on the active document
        or
      - Manual float entry to two decimal places (Photoshop Lab mode natively supports integers)

    Stephen Marsh
    https://github.com/MarshySwamp/CIE_Color_Difference_Calculator
    https://community.adobe.com/t5/photoshop-ecosystem-discussions/how-does-photoshop-calculate-lab-values/m-p/15028840

    Changelog:
    v1.0 - 10th December 2024: Private testing.
    v1.1 - 10th December 2024: Initial public release, no GUI.
    v1.2 - 31st May 2026:      Added (LCh) Lightness, Chroma & hue readings.
    v1.3 - 1st June 2026:      Replaced the native alert with a ScriptUI dialog with copy to clipboard button.
    v1.4 - 9th June 2026:      Added Delta L, a, b, C, h component breakdown & dE traffic light colouring.
    v1.5 - 17th June 2026:     Added editable L, a, b floating value input fields for foreground and background, removed the
                               traffic light colouring due to legibility issues.
    v1.6 - 1st July 2026:      Combined the separate dE76/ dE94/dE00 scripts into a single script with radio buttons to
                               switch between the three formulas.
    v1.7 - 1st July 2026:      Changed the colour source from the foreground/background swatches to Color Sampler 1 and
                               Color Sampler 2 on the active document.
    v1.8 - 1st July 2026:      Combined v1.6 and v1.7 into a single script. Added a checkbox to toggle between Foreground/Background
                               and Color Sampler 1/2 as the colour source.
    v1.9 - 3rd July 2026:      Minor GUI change, moved the "Enable manual entry" checkbox under the "Use Color Samplers" checkbox.
    v1.10 - 5th July 2026:     Replaced the two checkboxes with three radio buttons (Foreground/Background, Color Samplers and
                               Manual Entry). The initial Foreground/Background Lab values are stored once and used to restore when
                               switching back from samplers or manual entry.
    v1.11 - 11th July 2026:    Minor GUI change, moved the Manual Entry input panel into the Color Source panel.
    v2.0 - 12th July 2026:     Added range validation/clamping to the Manual Entry fields.
    v2.1 - 13th July 2026:     Fixed a rounding display error in the results panel.
*/

#target photoshop

main();

function main() {

    // -----------------------------------------------------------------------
    // Start with the Foreground / Background colors - always available,
    // no document or color samplers required.
    // -----------------------------------------------------------------------
    var fgColor = app.foregroundColor.lab;
    var bgColor = app.backgroundColor.lab;

    // -----------------------------------------------------------------------
    // Initial Foreground/Background Lab values. These are kept for the lifetime of the
    // dialog so that the Foreground/Background source can always be restored exactly,
    // even after the user has switched to the Color Sampler or Manual Entry sources.
    // -----------------------------------------------------------------------
    var initialFgLab = [Math.round(fgColor.l), Math.round(fgColor.a), Math.round(fgColor.b)];
    var initialBgLab = [Math.round(bgColor.l), Math.round(bgColor.a), Math.round(bgColor.b)];

    // Tracks which colour source is currently active: "fgbg", "sampler", or "manual"
    var colorSourceMode = "fgbg";

    // -----------------------------------------------------------------------
    // ScriptUI Dialog
    // -----------------------------------------------------------------------
    var win = new Window("dialog", "CIE Color Difference Calculator (v2.1)");
    win.alignChildren = "fill";
    win.spacing = 12;
    win.margins = 12;

    // -----------------------------------------------------------------------
    // Colour source panel: Foreground/Background, Color Samplers, Manual Entry
    // -----------------------------------------------------------------------
    var sourcePanel = win.add("panel", undefined, "Color Source");
    sourcePanel.alignChildren = "left";
    sourcePanel.spacing = 12;
    sourcePanel.margins = 12;

    var sourceGroup = sourcePanel.add("group");
    sourceGroup.orientation = "column";
    sourceGroup.alignChildren = "left";
    sourceGroup.spacing = 12;

    var rbFgBg = sourceGroup.add("radiobutton", undefined, "Use Foreground/Background Colors");
    var rbSampler = sourceGroup.add("radiobutton", undefined, "Use Color Samplers (Color Sampler 1 vs. Color Sampler 2)");
    var rbManual = sourceGroup.add("radiobutton", undefined, "Manual Entry (L*, a*, b*)");
    rbFgBg.value = true;   // default: Foreground/Background

    // -----------------------------------------------------------------------
    // Manual entry panel
    // -----------------------------------------------------------------------
    var manualEntryPanel = sourceGroup.add("panel", undefined, "");
    manualEntryPanel.orientation = "column";
    manualEntryPanel.alignChildren = "left";
    manualEntryPanel.spacing = 12;
    manualEntryPanel.margins = 12;

    // -----------------------------------------------------------------------
    // Manual entry row 1
    // -----------------------------------------------------------------------
    var manOneInputPanel = manualEntryPanel.add("group");
    manOneInputPanel.orientation = "row";
    manOneInputPanel.alignChildren = "center";
    manOneInputPanel.spacing = 12;

    manOneInputPanel.add("statictext", undefined, "Manual Entry 1:");

    manOneInputPanel.add("statictext", undefined, "L*:");
    var manOneL = manOneInputPanel.add("editnumber", undefined, initialFgLab[0]);
    manOneL.preferredSize.width = 40;
    manOneL.helpTip = "Manual Entry 1 L* (0 to 100.00)";

    manOneInputPanel.add("statictext", undefined, "a*:");
    var manOneA = manOneInputPanel.add("editnumber", undefined, initialFgLab[1]);
    manOneA.preferredSize.width = 40;
    manOneA.helpTip = "Manual Entry 1 a* (-128.00 to +127.00)";

    manOneInputPanel.add("statictext", undefined, "b*:");
    var manOneB = manOneInputPanel.add("editnumber", undefined, initialFgLab[2]);
    manOneB.preferredSize.width = 40;
    manOneB.helpTip = "Manual Entry 1 b* (-128.00 to +127.00)";

    // -----------------------------------------------------------------------
    // Manual entry row 2
    // -----------------------------------------------------------------------
    var manTwoInputPanel = manualEntryPanel.add("group");
    manTwoInputPanel.orientation = "row";
    manTwoInputPanel.alignChildren = "center";
    manTwoInputPanel.spacing = 12;

    manTwoInputPanel.add("statictext", undefined, "Manual Entry 2:");

    manTwoInputPanel.add("statictext", undefined, "L*:");
    var manTwoL = manTwoInputPanel.add("editnumber", undefined, initialBgLab[0]);
    manTwoL.preferredSize.width = 40;
    manTwoL.helpTip = "Manual Entry 2 L* (0 to 100.00)";

    manTwoInputPanel.add("statictext", undefined, "a*:");
    var manTwoA = manTwoInputPanel.add("editnumber", undefined, initialBgLab[1]);
    manTwoA.preferredSize.width = 40;
    manTwoA.helpTip = "Manual Entry 2 a* (-128.00 to +127.00)";

    manTwoInputPanel.add("statictext", undefined, "b*:");
    var manTwoB = manTwoInputPanel.add("editnumber", undefined, initialBgLab[2]);
    manTwoB.preferredSize.width = 40;
    manTwoB.helpTip = "Manual Entry 2 b* (-128.00 to +127.00)";

    // -----------------------------------------------------------------------
    // Results panel
    // -----------------------------------------------------------------------
    var panel = win.add("panel", undefined, "Color Differene Results");
    panel.alignChildren = "left";
    panel.spacing = 12;
    panel.margins = 12;

    // -----------------------------------------------------------------------
    // Radio buttons: dE mode selector (upper left of the panel)
    // -----------------------------------------------------------------------
    var modeGroup = panel.add("group");
    modeGroup.orientation = "row";
    modeGroup.alignChildren = "left";
    modeGroup.alignment = "left";
    modeGroup.spacing = 12;

    var rbdE76 = modeGroup.add("radiobutton", undefined, "\u0394E76");
    var rbdE94 = modeGroup.add("radiobutton", undefined, "\u0394E94");
    var rbdE00 = modeGroup.add("radiobutton", undefined, "\u0394E00");
    rbdE00.value = true; // default: dE00

    var headingText = panel.add("statictext", undefined,
        "Foreground vs. Background Color Picker Difference:");
    headingText.preferredSize.width = 360;

    // -----------------------------------------------------------------------
    // dE (bold)
    // -----------------------------------------------------------------------
    var deText = panel.add("statictext", undefined, "");
    deText.preferredSize.width = 360;
    deText.graphics.font = ScriptUI.newFont(
        deText.graphics.font.name,
        ScriptUI.FontStyle.BOLD,
        14
    );

    // -----------------------------------------------------------------------
    // Delta components
    // -----------------------------------------------------------------------
    var dLText = panel.add("statictext", undefined, "");
    dLText.preferredSize.width = 360;

    var dAText = panel.add("statictext", undefined, "");
    dAText.preferredSize.width = 360;

    var dBText = panel.add("statictext", undefined, "");
    dBText.preferredSize.width = 360;

    var dCText = panel.add("statictext", undefined, "");
    dCText.preferredSize.width = 360;

    var dHText = panel.add("statictext", undefined, "");
    dHText.preferredSize.width = 360;

    // -----------------------------------------------------------------------
    // Sampler 1 / Foreground summary label
    // -----------------------------------------------------------------------
    var fgText = panel.add("statictext", undefined, "", { multiline: true });
    fgText.preferredSize.width = 360;

    // -----------------------------------------------------------------------
    // Sampler 2 / Background summary label
    // -----------------------------------------------------------------------
    var bgText = panel.add("statictext", undefined, "", { multiline: true });
    bgText.preferredSize.width = 360;

    // -----------------------------------------------------------------------
    // Buttons
    // -----------------------------------------------------------------------
    var btnGroup = win.add("group");
    btnGroup.alignment = "right";
    btnGroup.spacing = 12;

    var cancelBtn = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });
    var copyBtn   = btnGroup.add("button", undefined, "Copy");

    // -----------------------------------------------------------------------
    // Helper: returns the currently selected dE mode as a string
    // -----------------------------------------------------------------------
    function getSelectedMode() {
        if (rbdE76.value) return "dE76";
        if (rbdE94.value) return "dE94";
        return "dE00";
    }

    // -----------------------------------------------------------------------
    // Helper: updates all static text (heading, panel titles, help tips,
    // summary label prefixes) to match the active colour source
    // -----------------------------------------------------------------------
    function updateLabelsForMode() {
        if (colorSourceMode === "sampler") {
            headingText.text = "Color Sampler 1 vs. Color Sampler 2 Difference:";
        } else if (colorSourceMode === "manual") {
            headingText.text = "Manual Entry 1 vs. Manual Entry 2 Difference:";
        } else {
            headingText.text = "Foreground vs. Background Color Picker Difference:";
        }
    }

    // -----------------------------------------------------------------------
    // Helper: returns the current colour-A / colour-B summary label prefixes
    // -----------------------------------------------------------------------
    function getSummaryPrefixes() {
        if (colorSourceMode === "sampler") {
            return { a: "Color Sampler 1", b: "Color Sampler 2" };
        } else if (colorSourceMode === "manual") {
            return { a: "Manual Entry 1", b: "Manual Entry 2" };
        }
        return { a: "Foreground", b: "Background" };
    }

    // -----------------------------------------------------------------------
    // Central recalculate-and-refresh function
    // -----------------------------------------------------------------------
    function recalculate() {

        var fL = manOneL.value;
        var fA = manOneA.value;
        var fB = manOneB.value;
        if (isNaN(fL)) { fL = 0; }
        if (isNaN(fA)) { fA = 0; }
        if (isNaN(fB)) { fB = 0; }

        var bL = manTwoL.value;
        var bA = manTwoA.value;
        var bB = manTwoB.value;
        if (isNaN(bL)) { bL = 0; }
        if (isNaN(bA)) { bA = 0; }
        if (isNaN(bB)) { bB = 0; }

        var currentFgLab = [fL, fA, fB];
        var currentBgLab = [bL, bA, bB];

        var currentFgLCH = labToLCH(currentFgLab);
        var currentBgLCH = labToLCH(currentBgLab);

        var mode = getSelectedMode();
        var dE, label;

        if (mode === "dE76") {
            dE = calculateCIEdE76(currentFgLab, currentBgLab);
            label = "\u0394E76";
        } else if (mode === "dE94") {
            dE = calculateCIEdE94(currentFgLab, currentBgLab);
            label = "\u0394E94";
        } else {
            dE = calculateCIEdE00(currentFgLab, currentBgLab);
            label = "\u0394E00";
        }

        // -----------------------------------------------------------------------
        // v2.1 - Result value formatting.
        // fmtComponent: for raw L*/a*/b* values and their direct deltas
        // (deltaL/deltaA/deltaB are plain differences, so they stay integer
        // whenever the inputs are integer). FG/BG and Color Sampler inputs
        // are always whole numbers in Photoshop, so those modes display as
        // integers; Manual Entry keeps 2 decimal places.
        // fmt: for derived values (C*, h*, dE, deltaC, deltaH) which involve
        // sqrt/trig and are not guaranteed to be whole numbers even when the
        // L*/a*/b* inputs are integers - always shown to 2 decimal places.
        // -----------------------------------------------------------------------
        function fmtComponent(val) {
            if (colorSourceMode === "manual") {
                return val.toFixed(2);
            }
            return Math.round(val).toString();
        }

        function fmt(val) {
            return val.toFixed(2);
        }

        var deltaL = fL - bL;
        var deltaA = fA - bA;
        var deltaB = fB - bB;
        var deltaC = currentFgLCH.C - currentBgLCH.C;

        // -----------------------------------------------------------------------
        // Hue angle difference, normalised to [-180, +180]
        // -----------------------------------------------------------------------
        var deltaH = currentFgLCH.H - currentBgLCH.H;
        if (deltaH >  180) { deltaH -= 360; }
        if (deltaH < -180) { deltaH += 360; }

        // -----------------------------------------------------------------------
        // Update dE label text
        // -----------------------------------------------------------------------
        deText.text = label + ": " + fmt(dE);

        // -----------------------------------------------------------------------
        // Update delta component labels
        // -----------------------------------------------------------------------
        dLText.text = "\u0394L*: " + fmtComponent(deltaL);
        dAText.text = "\u0394a*: " + fmtComponent(deltaA);
        dBText.text = "\u0394b*: " + fmtComponent(deltaB);
        dCText.text = "\u0394C*: " + fmt(deltaC);
        dHText.text = "\u0394h*: " + fmt(deltaH) + "\u00B0";

        // -----------------------------------------------------------------------
        // Update footer summary labels using the current color source's prefixes
        // -----------------------------------------------------------------------
        var prefixes = getSummaryPrefixes();

        fgText.text =
            prefixes.a + " (L*: " + fmtComponent(fL) +
            ", a*: " + fmtComponent(fA) +
            ", b*: " + fmtComponent(fB) +
            ", C*: " + fmt(currentFgLCH.C) +
            ", h*: " + fmt(currentFgLCH.H) + "\u00B0)";

        bgText.text =
            prefixes.b + " (L*: " + fmtComponent(bL) +
            ", a*: " + fmtComponent(bA) +
            ", b*: " + fmtComponent(bB) +
            ", C*: " + fmt(currentBgLCH.C) +
            ", h*: " + fmt(currentBgLCH.H) + "\u00B0)";

        // -----------------------------------------------------------------------
        // Keep a live alertText for the Copy button
        // -----------------------------------------------------------------------
        win._alertText =
            headingText.text + "\n\n" +
            label + ": " + fmt(dE) + "\n\n" +
            "\u0394L*: "   + fmtComponent(deltaL) + "\n" +
            "\u0394a*: "   + fmtComponent(deltaA) + "\n" +
            "\u0394b*: "   + fmtComponent(deltaB) + "\n" +
            "\u0394C*: "   + fmt(deltaC) + "\n" +
            "\u0394h*: "   + fmt(deltaH) + "\u00B0\n\n" +
            fgText.text + "\n" +
            bgText.text;
    }

    // -----------------------------------------------------------------------
    // Radio buttons: switch dE formula and recalculate live
    // -----------------------------------------------------------------------
    rbdE76.onClick = recalculate;
    rbdE94.onClick = recalculate;
    rbdE00.onClick = recalculate;

    // -----------------------------------------------------------------------
    // Radio buttons: switch between Foreground/Background, Color Sampler 1&2,
    // and Manual Entry as the colour source. Only one can be active at a time.
    // -----------------------------------------------------------------------

    // Start disabled - only Manual Entry allows direct editing of the fields
    manOneInputPanel.enabled = false;
    manTwoInputPanel.enabled = false;

    // Foreground / Background - restores the Lab values captured at script
    // start, so the original swatches are always recoverable.
    rbFgBg.onClick = function () {
        manOneL.value = initialFgLab[0];
        manOneA.value = initialFgLab[1];
        manOneB.value = initialFgLab[2];
        manTwoL.value = initialBgLab[0];
        manTwoA.value = initialBgLab[1];
        manTwoB.value = initialBgLab[2];

        colorSourceMode = "fgbg";
        manOneInputPanel.enabled = false;
        manTwoInputPanel.enabled = false;

        updateLabelsForMode();
        recalculate();
    };

    // -----------------------------------------------------------------------
    // Color Samplers - validates that a document with at least 2 color
    // samplers is available before committing to this mode.
    // -----------------------------------------------------------------------
    rbSampler.onClick = function () {

        if (!app.documents.length) {
            alert("No document open.\n\nOpen a document and place at least 2 color samplers before using this mode.");
            rbFgBg.value = true;
            colorSourceMode = "fgbg";
            return;
        }

        var activeDoc = app.activeDocument;

        if (activeDoc.colorSamplers.length < 2) {
            alert("At least 2 color samplers are required.\n\n" +
                  "Currently found: " + activeDoc.colorSamplers.length + "\n\n" +
                  "Add color samplers with the Color Sampler tool (I) and try again.\n" +
                  "This mode compares Color Sampler 1 vs. Color Sampler 2.");
            rbFgBg.value = true;
            colorSourceMode = "fgbg";
            return;
        }

        // -----------------------------------------------------------------------
        // Validation passed - pull the Lab values from the two color samplers
        // -----------------------------------------------------------------------
        var sampler1 = activeDoc.colorSamplers[0].color.lab;
        var sampler2 = activeDoc.colorSamplers[1].color.lab;

        manOneL.value = Math.round(sampler1.l);
        manOneA.value = Math.round(sampler1.a);
        manOneB.value = Math.round(sampler1.b);
        manTwoL.value = Math.round(sampler2.l);
        manTwoA.value = Math.round(sampler2.a);
        manTwoB.value = Math.round(sampler2.b);

        colorSourceMode = "sampler";
        manOneInputPanel.enabled = false;
        manTwoInputPanel.enabled = false;

        updateLabelsForMode();
        recalculate();
    };

    // -----------------------------------------------------------------------
    // Manual Entry - unlocks both input panels for free editing. The values
    // already showing (whichever source was active) are left in place as a
    // convenient starting point for manual adjustment.
    // -----------------------------------------------------------------------
    rbManual.onClick = function () {
        colorSourceMode = "manual";
        manOneInputPanel.enabled = true;
        manTwoInputPanel.enabled = true;

        updateLabelsForMode();
        recalculate();
    };

    // -----------------------------------------------------------------------
    // Manual entry field validation - clamps each field to its valid Lab
    // range and rounds to 2 decimal places, then triggers a live recalculate.
    // L*: 0.00 to 100.00 a*/b*: -128.00 to 127.00 as editable floats.
    // -----------------------------------------------------------------------
    function roundTo2(val) {
        return Math.round(val * 100) / 100;
    }

    function makeManualFieldValidator(field, min, max) {
        return function () {
            var v = field.value;
            if (isNaN(v)) { v = 0; }
            v = roundTo2(v);
            if (v < min) { v = min; }
            if (v > max) { v = max; }
            field.value = v;
            recalculate();
        };
    }

    // -----------------------------------------------------------------------
    // Set onChange on each editnumber field to validate/clamp and then
    // trigger a live recalculate
    // -----------------------------------------------------------------------
    manOneL.onChange = makeManualFieldValidator(manOneL, 0, 100);
    manOneA.onChange = makeManualFieldValidator(manOneA, -128, 127);
    manOneB.onChange = makeManualFieldValidator(manOneB, -128, 127);
    manTwoL.onChange = makeManualFieldValidator(manTwoL, 0, 100);
    manTwoA.onChange = makeManualFieldValidator(manTwoA, -128, 127);
    manTwoB.onChange = makeManualFieldValidator(manTwoB, -128, 127);

    // -----------------------------------------------------------------------
    // Button handlers
    // -----------------------------------------------------------------------
    cancelBtn.onClick = function () {
        win.close();
    };

    copyBtn.onClick = function () {
        var d = new ActionDescriptor();
        d.putString(stringIDToTypeID("textData"), win._alertText || "");
        executeAction(stringIDToTypeID("textToClipboard"), d, DialogModes.NO);
        win.close();
    };

    // -----------------------------------------------------------------------
    // Populate all display fields with the initial Photoshop values
    // -----------------------------------------------------------------------
    updateLabelsForMode();
    recalculate();

    win.show();
}

// -----------------------------------------------------------------------
// LCh - converts a LAB array [L, a, b] to an LCh object { L, C, H }
// -----------------------------------------------------------------------
function labToLCH(lab) {
    var L = lab[0];
    var C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    var H = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
    if (H < 0) { H += 360; }
    return { L: L, C: C, H: H };
}

// -----------------------------------------------------------------------
// dE76 (CIE76 / dEab) - simple Euclidean distance in Lab space
// -----------------------------------------------------------------------
function calculateCIEdE76(lab1, lab2) {
    var deltaL = lab1[0] - lab2[0];
    var deltaA = lab1[1] - lab2[1];
    var deltaB = lab1[2] - lab2[2];
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

// -----------------------------------------------------------------------
// dE94 (CIE94) - Formula improved for perceptual uniformity
// -----------------------------------------------------------------------
function calculateCIEdE94(lab1, lab2) {
    var kL = 1, kC = 1, kH = 1;
    var K1 = 0.045, K2 = 0.015;

    var deltaL = lab1[0] - lab2[0];
    var deltaA = lab1[1] - lab2[1];
    var deltaB = lab1[2] - lab2[2];

    var c1 = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
    var c2 = Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2]);
    var deltaC = c1 - c2;
    var deltaH2 = Math.max(0, deltaA * deltaA + deltaB * deltaB - deltaC * deltaC);

    var sl = 1;
    var sc = 1 + K1 * c1;
    var sh = 1 + K2 * c1;

    return Math.sqrt(
        Math.pow(deltaL / (kL * sl), 2) +
        Math.pow(deltaC / (kC * sc), 2) +
        deltaH2 / Math.pow(kH * sh, 2)
    );
}

// -----------------------------------------------------------------------
// dE00 (CIEDE2000) - Formula best matches human vision
// -----------------------------------------------------------------------
function calculateCIEdE00(lab1, lab2) {
    var kL = 1, kC = 1, kH = 1;

    function degToRad(deg) { return (deg * Math.PI) / 180; }

    var c1 = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
    var c2 = Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2]);
    var cBar = (c1 + c2) / 2;

    var g = 0.5 * (1 - Math.sqrt(Math.pow(cBar, 7) / (Math.pow(cBar, 7) + Math.pow(25, 7))));

    var a1Prime = lab1[1] * (1 + g);
    var a2Prime = lab2[1] * (1 + g);

    var c1Prime = Math.sqrt(a1Prime * a1Prime + lab1[2] * lab1[2]);
    var c2Prime = Math.sqrt(a2Prime * a2Prime + lab2[2] * lab2[2]);
    var cBarPrime = (c1Prime + c2Prime) / 2;

    var h1Prime = Math.atan2(lab1[2], a1Prime);
    var h2Prime = Math.atan2(lab2[2], a2Prime);
    if (h1Prime < 0) h1Prime += 2 * Math.PI;
    if (h2Prime < 0) h2Prime += 2 * Math.PI;

    var hBarPrime = Math.abs(h1Prime - h2Prime) > Math.PI
        ? (h1Prime + h2Prime + 2 * Math.PI) / 2
        : (h1Prime + h2Prime) / 2;

    var deltaHPrimeRaw = Math.abs(h1Prime - h2Prime) > Math.PI
        ? h2Prime - h1Prime + 2 * Math.PI * (h2Prime <= h1Prime ? 1 : -1)
        : h2Prime - h1Prime;

    var deltaLPrime = lab2[0] - lab1[0];
    var deltaCPrime = c2Prime - c1Prime;
    var deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrimeRaw / 2);

    var lBar = (lab1[0] + lab2[0]) / 2;
    var t = 1
        - 0.17 * Math.cos(hBarPrime - degToRad(30))
        + 0.24 * Math.cos(2 * hBarPrime)
        + 0.32 * Math.cos(3 * hBarPrime + degToRad(6))
        - 0.20 * Math.cos(4 * hBarPrime - degToRad(63));

    var sl = 1 + (0.015 * Math.pow(lBar - 50, 2)) / Math.sqrt(20 + Math.pow(lBar - 50, 2));
    var sc = 1 + 0.045 * cBarPrime;
    var sh = 1 + 0.015 * cBarPrime * t;

    var deltaTheta = degToRad(30) * Math.exp(-Math.pow((hBarPrime - degToRad(275)) / degToRad(25), 2));
    var rc = 2 * Math.sqrt(Math.pow(cBarPrime, 7) / (Math.pow(cBarPrime, 7) + Math.pow(25, 7)));
    var rt = -rc * Math.sin(2 * deltaTheta);

    return Math.sqrt(
        Math.pow(deltaLPrime / (kL * sl), 2) +
        Math.pow(deltaCPrime / (kC * sc), 2) +
        Math.pow(deltaHPrime / (kH * sh), 2) +
        rt * (deltaCPrime / (kC * sc)) * (deltaHPrime / (kH * sh))
    );
}
