/** The drawer label in its metal holder. The 3D Sala draws the same one on a canvas (sala-3d/textures.ts). */
export function Rotulo({ numeral, nombre, rango }: { numeral: string; nombre: string; rango: string }) {
  return (
    <span className="rotulo-holder">
      <span className="rotulo">
        <span className="rotulo-numeral">{numeral}</span>
        <span className="rotulo-nombre">{nombre}</span>
        <span className="rotulo-rango">{rango}</span>
      </span>
    </span>
  );
}
