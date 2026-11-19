import { expect, test } from "@playwright/test";

import { errorsOn, sideways } from "./browser";

const PAGES = [
  { path: "/autor", title: "Sobre el Autor" },
  { path: "/archivo", title: "Sobre el archivo" },
  { path: "/contacto", title: "Contacto" },
];

test("the pages about the Autor, the archive and contact are prerendered with a title and description", async ({
  request,
}) => {
  for (const { path, title } of PAGES) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();

    expect(html, path).toMatch(new RegExp(`<h1[^>]*>${title}</h1>`));
    expect(html, path).toContain(`<title>${title} · Raúl E. Paz Zanini`);
    expect(html, path).toMatch(/<meta name="description" content="[^"]+"/);
  }
});

for (const { path, title } of PAGES) {
  test(`${title}: the Autor's name leads home and nothing scrolls sideways at 320`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Raúl E. Paz Zanini" })
      .click();
    await expect(page).toHaveURL("/");
    expect(await errorsOn(page)).toEqual([]);
  });
}

test("Sobre el archivo leads to the first step of each Recorrido and to the Manual of each Carrera", async ({
  page,
}) => {
  const opens = async (name: string) => {
    await page.goto("/archivo");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  };

  await opens("Estadística descriptiva desde cero");
  await opens("Guía para un buen análisis de datos");
  await opens("Estadística aplicada a la obstetricia");
  await opens("Estadística aplicada al trabajo social");
});
