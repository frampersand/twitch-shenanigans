import { syncUniteRosterFromGame8 } from "../services/uniteRoster/sync.js";

const result = await syncUniteRosterFromGame8();
console.log(
  `Unite roster sync complete. Added ${result.added.length} pokemon (${result.total} total).`
);
if (result.added.length) {
  console.log(result.added.join(", "));
}
