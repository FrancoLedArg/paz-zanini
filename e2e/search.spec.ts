import { expect, test } from "@playwright/test";

import { errorsOn, pilaLinks, tapBook } from "./browser";

test("a visitor searches, filters by Carrera, shares the URL, and goes back", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Buscar un manual" })
    .fill("estadistica");
  await expect(pilaLinks(page)).toHaveCount(11);

  await page
    .getByRole("combobox", { name: "Carrera" })
    .selectOption("Kinesiología");
  await expect(pilaLinks(page)).toHaveCount(1);
  await expect(pilaLinks(page)).toHaveAccessibleName(
    "Estadística aplicada a la kinesiología y fisiatría",
  );
  await expect(page.getByRole("status")).toHaveText("1 de 22 manuales");

  const shared = await context.newPage();
  await shared.goto(page.url());
  await expect(pilaLinks(shared)).toHaveCount(1);
  await expect(
    shared.getByRole("searchbox", { name: "Buscar un manual" }),
  ).toHaveValue("estadistica");
  await expect(shared.getByRole("combobox", { name: "Carrera" })).toHaveValue(
    "Kinesiología",
  );
  expect(await errorsOn(shared)).toEqual([]);

  await page.goBack();
  await expect(pilaLinks(page)).toHaveCount(11);
  await expect(
    page.getByRole("searchbox", { name: "Buscar un manual" }),
  ).toHaveValue("estadistica");
  expect(await errorsOn(page)).toEqual([]);
});

test("a Visita de regreso reaches a Manual in three taps", async ({ page }) => {
  await page.goto("/");

  // Taps one and two: open the Carrera picker and choose. Tap three: the book.
  await page
    .getByRole("combobox", { name: "Carrera" })
    .selectOption("Periodismo");
  await tapBook(pilaLinks(page).first());

  await expect(page).toHaveURL("/manuales/estadistica-aplicada-periodismo");
});

test("a Visita de regreso reaches a desde cero Manual in three taps", async ({
  page,
}) => {
  await page.goto("/");

  // Taps one and two: the Colección. Tap three: the last book in it.
  await page
    .getByRole("combobox", { name: "Colección" })
    .selectOption("ciencia-de-datos-desde-cero");
  await tapBook(pilaLinks(page).last());

  await expect(page).toHaveURL("/manuales/metodos-numericos-desde-cero");
});

test("editing the search mid-word keeps the caret where it is", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Buscar un manual" });
  await search.click();
  await page.keyboard.type("esttica");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("adis");

  await expect(search).toHaveValue("estadistica");
  await expect(pilaLinks(page)).toHaveCount(11);
});

test("a search with no match says so, and clearing it brings la Pila back", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Buscar un manual" })
    .fill("astrologia");

  await expect(pilaLinks(page)).toHaveCount(0);
  await expect(page.getByText("No hay manuales que coincidan")).toBeVisible();
  await page.getByRole("button", { name: "Borrar búsqueda y filtros" }).click();

  await expect(pilaLinks(page)).toHaveCount(22);
  await expect(page).toHaveURL("/");
});
