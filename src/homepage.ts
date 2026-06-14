export function renderHomePage(root: HTMLElement) {
  root.innerHTML = `
    <section class="hero" aria-labelledby="app-title">
      <p class="eyebrow">Offline bird practice</p>
      <h1 id="app-title">Swiss Birds Quiz</h1>
      <button type="button">Start quiz</button>
    </section>
  `;
}
