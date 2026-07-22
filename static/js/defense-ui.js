import { ZONE_PRESETS } from "./defense/zone.js";

const OFFENSE_IDS = ["O1", "O2", "O3", "O4", "O5"];
const DEFENSE_IDS = ["D1", "D2", "D3", "D4", "D5"];

export function wireManDefenseUI(play) {
  const container = document.getElementById("man-assignments");
  const assignmentSelects = {};
  OFFENSE_IDS.forEach((offenseId, index) => {
    const label = document.createElement("label");
    label.textContent = `${offenseId} guarded by: `;
    const select = document.createElement("select");
    for (const defenseId of DEFENSE_IDS) {
      const option = document.createElement("option");
      option.value = defenseId;
      option.textContent = defenseId;
      select.appendChild(option);
    }
    if (!play.defense.man.assignments[offenseId]) {
      play.defense.man.assignments[offenseId] = DEFENSE_IDS[index];
    }
    select.value = play.defense.man.assignments[offenseId];
    select.addEventListener("change", () => {
      play.defense.man.assignments[offenseId] = select.value;
    });
    assignmentSelects[offenseId] = select;
    label.appendChild(select);
    container.appendChild(label);
  });

  const helpSchemeSelect = document.getElementById("help-scheme");
  helpSchemeSelect.value = play.defense.man.help_scheme;
  helpSchemeSelect.addEventListener("change", (event) => {
    play.defense.man.help_scheme = event.target.value;
  });

  const lagInput = document.getElementById("param-lag");
  lagInput.value = play.defense.man.params.lag;
  lagInput.addEventListener("input", (event) => {
    play.defense.man.params.lag = parseFloat(event.target.value);
  });

  const helpWeightInput = document.getElementById("param-help-weight");
  helpWeightInput.value = play.defense.man.params.help_weight;
  helpWeightInput.addEventListener("input", (event) => {
    play.defense.man.params.help_weight = parseFloat(event.target.value);
  });

  const rimBiasInput = document.getElementById("param-rim-bias");
  rimBiasInput.value = play.defense.man.params.rim_bias;
  rimBiasInput.addEventListener("input", (event) => {
    play.defense.man.params.rim_bias = parseFloat(event.target.value);
  });

  return {
    refresh() {
      OFFENSE_IDS.forEach((offenseId, index) => {
        if (!play.defense.man.assignments[offenseId]) {
          play.defense.man.assignments[offenseId] = DEFENSE_IDS[index];
        }
        assignmentSelects[offenseId].value = play.defense.man.assignments[offenseId];
      });
      helpSchemeSelect.value = play.defense.man.help_scheme;
      lagInput.value = play.defense.man.params.lag;
      helpWeightInput.value = play.defense.man.params.help_weight;
      rimBiasInput.value = play.defense.man.params.rim_bias;
    },
  };
}

function applyZoneType(play, type) {
  play.defense.zone = play.defense.zone || {
    params: { ball_shade_weight: 0.5, gap_shade_weight: 0.3, max_shade: 8 },
  };
  play.defense.zone.type = type;
  play.defense.zone.home_points = structuredClone(ZONE_PRESETS[type]);
  if (type === "box-and-1") {
    play.defense.zone.man_mark = { D5: document.getElementById("box-one-target").value };
  } else {
    delete play.defense.zone.man_mark;
  }
  document.getElementById("box-one-target-label").style.display = type === "box-and-1" ? "" : "none";
}

export function wireZoneDefenseUI(play) {
  const zoneConfig = document.getElementById("zone-config");
  const manAssignments = document.getElementById("man-assignments").closest("fieldset");
  const defenseModeSelect = document.getElementById("defense-mode");
  const zoneTypeSelect = document.getElementById("zone-type");
  const boxOneTargetInput = document.getElementById("box-one-target");
  const boxOneTargetLabel = document.getElementById("box-one-target-label");
  const ballShadeInput = document.getElementById("zone-ball-shade");
  const gapShadeInput = document.getElementById("zone-gap-shade");
  const maxShadeInput = document.getElementById("zone-max-shade");

  defenseModeSelect.addEventListener("change", (event) => {
    play.defense.mode = event.target.value;
    zoneConfig.style.display = event.target.value === "zone" ? "" : "none";
    manAssignments.style.display = event.target.value === "man" ? "" : "none";
    if (event.target.value === "zone" && !play.defense.zone) {
      applyZoneType(play, zoneTypeSelect.value);
    }
  });

  zoneTypeSelect.addEventListener("change", (event) => {
    applyZoneType(play, event.target.value);
  });
  boxOneTargetInput.addEventListener("input", (event) => {
    if (play.defense.zone.man_mark) play.defense.zone.man_mark.D5 = event.target.value;
  });
  ballShadeInput.addEventListener("input", (event) => {
    play.defense.zone.params.ball_shade_weight = parseFloat(event.target.value);
  });
  gapShadeInput.addEventListener("input", (event) => {
    play.defense.zone.params.gap_shade_weight = parseFloat(event.target.value);
  });
  maxShadeInput.addEventListener("input", (event) => {
    play.defense.zone.params.max_shade = parseFloat(event.target.value);
  });

  return {
    refresh() {
      defenseModeSelect.value = play.defense.mode;
      zoneConfig.style.display = play.defense.mode === "zone" ? "" : "none";
      manAssignments.style.display = play.defense.mode === "man" ? "" : "none";
      if (play.defense.zone) {
        zoneTypeSelect.value = play.defense.zone.type;
        ballShadeInput.value = play.defense.zone.params.ball_shade_weight;
        gapShadeInput.value = play.defense.zone.params.gap_shade_weight;
        maxShadeInput.value = play.defense.zone.params.max_shade;
        const isBoxOne = play.defense.zone.type === "box-and-1";
        boxOneTargetLabel.style.display = isBoxOne ? "" : "none";
        if (isBoxOne && play.defense.zone.man_mark) {
          boxOneTargetInput.value = play.defense.zone.man_mark.D5;
        }
      }
    },
  };
}
