const OFFENSE_IDS = ["O1", "O2", "O3", "O4", "O5"];
const DEFENSE_IDS = ["D1", "D2", "D3", "D4", "D5"];

export function wireManDefenseUI(play) {
  const container = document.getElementById("man-assignments");
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
}
