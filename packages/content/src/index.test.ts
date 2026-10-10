import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getSeries } from "./index.ts";

test("getSeries loads the five Series in Archivador order", () => {
  const series = getSeries();
  assert.deepEqual(series.map((s) => s.numeral), ["Serie I", "Serie II", "Serie III", "Serie IV", "Serie V"]);
  const est = series[0];
  assert.ok("guias" in est);
  const est03 = est.guias[0].documentos[2];
  assert.equal(est03.signatura, "EST-03");
  assert.equal(est03.titulo, "Estadística inferencial desde 0");
  assert.equal(est03.tipo, "Manual");
  assert.equal(est03.pdf, "https://9e95708f-2c13-4d36-a954-9fe5775bd795.filesusr.com/ugd/39753d_8e13eff30ceb4c11b6139031d69f6ea7.pdf");
});

function dataCopy(edit: (yaml: string) => string, file = "datos.yaml") {
  const dir = mkdtempSync(join(tmpdir(), "content-"));
  cpSync(join(import.meta.dirname, "../data"), dir, { recursive: true });
  writeFileSync(join(dir, file), edit(readFileSync(join(dir, file), "utf8")));
  return dir;
}

test("getSeries rejects a Documento without alcance, naming the file", () => {
  const dir = dataCopy((y) => y.replace(/^ +alcance: Primeros pasos con Python.*\n/m, ""));
  assert.throws(() => getSeries(dir), /datos\.yaml[\s\S]*alcance/);
});

test("getSeries rejects a repeated Signatura", () => {
  const dir = dataCopy((y) => y.replace("signatura: CD-02", "signatura: EST-03"));
  assert.throws(() => getSeries(dir), /EST-03/);
});

test("getSeries rejects an Antecedente that points to a missing Documento", () => {
  const dir = dataCopy((y) => y.replace("documento: AP-01", "documento: AP-99"), "expediente.yaml");
  assert.throws(() => getSeries(dir), /AP-99/);
});
