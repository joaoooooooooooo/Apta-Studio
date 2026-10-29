// Shared by the editor rail and docs header.
export default function LogoMark({ height = 32 }: { height?: number }) {
  return (
    <img
      src="/brand-icon.gif?v=2"
      alt=""
      width={height}
      height={height}
      aria-hidden="true"
      style={{ borderRadius: 2, display: 'block' }}
    />
  );
}
