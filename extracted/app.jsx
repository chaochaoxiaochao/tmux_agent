// app.jsx — top-level wiring: design canvas + tweaks panel
const { useState, useEffect } = React;

window.__tweaks = window.__tweaks || {};

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "dark": true,
    "showAnnotations": true,
    "sketchiness": 1.0,
    "accent": "green"
  }/*EDITMODE-END*/);

  // mirror tweaks onto window so SVG primitives can read them
  useEffect(() => {
    window.__tweaks = tweaks;
    // re-render artboards by toggling a counter on body — simpler: dispatch event
    window.dispatchEvent(new Event('tweaks-changed'));
  }, [tweaks]);

  // force re-render on tweaks-changed
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(x => x + 1);
    window.addEventListener('tweaks-changed', h);
    return () => window.removeEventListener('tweaks-changed', h);
  }, []);

  return (
    <>
      <DesignCanvas>
        <DCSection id="agents" title="tmux · agent panel" subtitle="four wireframe directions · dark mode · low-fi">
          <DCArtboard id="a" label="A · classic tabs + right rail" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantA />
          </DCArtboard>
          <DCArtboard id="b" label="B · tabs + bottom dock" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantB />
          </DCArtboard>
          <DCArtboard id="c" label="C · sidebar tree + split panes" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantC />
          </DCArtboard>
          <DCArtboard id="d" label="D · agent wall (grid of windows)" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantD />
          </DCArtboard>
          <DCArtboard id="d-attached" label="D · attached (after clicking a tile)" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantDAttached />
          </DCArtboard>
          <DCArtboard id="input" label="E · shortcuts + voice/text input" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantInput />
          </DCArtboard>
          <DCArtboard id="responsive" label="F · responsive (web + mobile)" width={ARTBOARD_W} height={ARTBOARD_H}>
            <VariantResponsive />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="theme">
          <TweakToggle label="dark mode" value={tweaks.dark} onChange={v => setTweak('dark', v)} />
          <TweakToggle label="annotations" value={tweaks.showAnnotations} onChange={v => setTweak('showAnnotations', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
