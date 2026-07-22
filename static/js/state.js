export function createEmptyPlay() {
  return {
    name: "",
    offense: ["O1", "O2", "O3", "O4", "O5"].map((id) => ({
      id,
      start_pos: [0, 0],
      actions: [],
    })),
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: {},
        help_scheme: "uniform",
        params: { lag: 0.3, help_weight: 0.4, rim_bias: 0.2 },
      },
      zone: null,
    },
  };
}
