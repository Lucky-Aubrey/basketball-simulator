import { drawCourt } from "./court.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
drawCourt(ctx, canvas.width, canvas.height);
