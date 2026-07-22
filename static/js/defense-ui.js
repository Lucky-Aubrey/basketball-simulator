const OFFENSE_IDS = ["O1", "O2", "O3", "O4", "O5"];
const DEFENSE_IDS = ["D1", "D2", "D3", "D4", "D5"];

export function wireManDefenseUI(play) {
  const container = document.getElementById("man-assignments");
  for (const offenseId of OFFENSE_IDS) {
    const label = document.createElement("label");
    label.textContent = `${offenseId} guarded by: `;
    const select = document.createElement("select");
    for (const defenseId of DEFENSE_IDS) {
      const option = document.createElement("option");
      option.value = defenseId;
      option.textContent = defenseId;
      select.appendChild(option);
    }
    select.value = play.defense.man.assignments[offenseId] || "";
    select.addEventListener("change", () => {
      play.defense.man.assignments[offenseId] = select.value;
    });
    play.defense.man.assignments[offenseId] = select.value;
    label.appendChild(select);
    container.appendChild(label);
  }

  document.getElementById("help-scheme").addEventListener("change", (event) => {
    play.defense.man.help_scheme = event.target.value;
  });
  document.getElementById("param-lag").addEventListener("input", (event) => {
    play.defense.man.params.lag = parseFloat(event.target.value);
  });
  document.getElementById("param-help-weight").addEventListener("input", (event) => {
    play.defense.man.params.help_weight = parseFloat(event.target.value);
  });
  document.getElementById("param-rim-bias").addEventListener("input", (event) => {
    play.defense.man.params.rim_bias = parseFloat(event.target.value);
  });
}
