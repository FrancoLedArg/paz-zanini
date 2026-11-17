import { expect, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";
import { errorsOn, escapeHtml } from "./browser";

test("every Manual page is prerendered with its title and link-preview metadata", async ({
  request,
}) => {
  for (const manual of MANUALES) {
    const response = await request.get(`/manuales/${manual.slug}`);
    expect(response.status(), manual.slug).toBe(200);
    const html = await response.text();

    expect(html).toContain(`<h1`);
    expect(html).toContain(`<title>${escapeHtml(manual.title)}`);
    expect(html).toContain(
      `<meta name="description" content="${escapeHtml(manual.subtitle)}"/>`,
    );
    expect(html).toContain(
      `<meta property="og:title" content="${escapeHtml(manual.title)}"/>`,
    );
    expect(html).toContain(`href="/manuales/${manual.slug}.pdf"`);
  }
});

test("a visitor opens a Manual page, follows its Par and finds Descargar", async ({
  page,
}) => {
  await page.goto("/manuales/datos-en-rstudio-desde-cero");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Trabajar con datos en RStudio desde cero",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Trabajar con datos en Python desde cero" })
    .click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Trabajar con datos en Python desde cero",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Descargar manual" }),
  ).toBeVisible();
  expect(await errorsOn(page)).toEqual([]);
});

test("Descargar saves the Manual's PDF, which is not fetched before the tap", async ({
  page,
}) => {
  const pdfRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".pdf")) pdfRequests.push(request.url());
  });
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  await page.waitForLoadState("networkidle");
  expect(pdfRequests).toEqual([]);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar manual" }).click();

  expect((await download).suggestedFilename()).toBe(
    "estadistica-inferencial-desde-cero.pdf",
  );
});

test("the Recorrido links the previous and next steps in catalog order", async ({
  page,
}) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  const recorrido = page.getByRole("navigation", { name: "Recorrido" });

  await expect(recorrido).toContainText("Paso 3 de 6");
  await recorrido
    .getByRole("link", {
      name: "Probabilidad y distribuciones de probabilidad desde cero",
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Probabilidad y distribuciones de probabilidad desde cero",
  );

  await recorrido
    .getByRole("link", { name: "Estadística inferencial desde cero" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Estadística inferencial desde cero",
  );
  await expect(
    recorrido.getByRole("link", {
      name: "Estadística no paramétrica desde cero",
    }),
  ).toBeVisible();
});

test("an unknown Manual shows the Spanish not-found page with a way home", async ({
  page,
}) => {
  await page.goto("/manuales/no-existe");

  await expect(
    page.getByRole("heading", { name: "No encontramos esta página" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver a los Manuales" }).click();
  await expect(page).toHaveURL("/");
});
