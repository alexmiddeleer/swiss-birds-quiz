type BirdCatalog = {
  birds: Bird[];
};

type Bird = {
  scientificName: string;
  commonName: string;
  images: BirdImage[];
};

type BirdImage = {
  path: string;
  provenancePath: string;
};

type ImageProvenance = {
  artist: string;
  credit: string;
  filePageUrl: string;
  licenseShortName: string;
};

type LoadProvenance = (path: string) => Promise<ImageProvenance>;

export function renderHomePage(
  root: HTMLElement,
  catalog: BirdCatalog = { birds: [] },
  loadProvenance: LoadProvenance = loadImageProvenance,
) {
  root.innerHTML = `
    <section class="hero" aria-labelledby="app-title">
      <p class="eyebrow">Offline bird practice</p>
      <h1 id="app-title">Swiss Birds Quiz</h1>
      <button type="button">Start quiz</button>
    </section>
  `;

  root.querySelector("button")?.addEventListener("click", async () => {
    await renderQuiz(root, catalog, loadProvenance);
  });
}

async function renderQuiz(
  root: HTMLElement,
  catalog: BirdCatalog,
  loadProvenance: LoadProvenance,
) {
  const bird = catalog.birds[0];
  const image = bird?.images[0];

  if (!bird || !image) {
    root.innerHTML = `
      <section class="hero" aria-labelledby="empty-title">
        <p class="eyebrow">No birds yet</p>
        <h1 id="empty-title">Add bird images to start</h1>
      </section>
    `;
    return;
  }

  const provenance = await loadProvenance(image.provenancePath);
  root.innerHTML = quizMarkup(bird, image, provenance, false);

  root.querySelector(".quiz-card")?.addEventListener("click", () => {
    root.innerHTML = quizMarkup(bird, image, provenance, true);
  });
}

function quizMarkup(
  bird: Bird,
  image: BirdImage,
  provenance: ImageProvenance,
  revealed: boolean,
) {
  return `
    <section class="quiz" aria-labelledby="quiz-title">
      <p class="eyebrow">Practice Session</p>
      <h1 id="quiz-title">Which Swiss bird is this?</h1>
      <figure class="quiz-card" tabindex="0" role="button" aria-label="Reveal bird name">
        <img src="${assetUrl(image.path)}" alt="Bird to identify" />
        <figcaption class="citation">
          Photo: ${escapeHtml(provenance.artist)} · ${escapeHtml(provenance.credit)} · ${escapeHtml(provenance.licenseShortName)} ·
          <a href="${escapeAttribute(provenance.filePageUrl)}" target="_blank" rel="noreferrer">source</a>
        </figcaption>
      </figure>
      ${
        revealed
          ? `<div class="answer"><h2>${escapeHtml(bird.commonName)}</h2><p><i>${escapeHtml(bird.scientificName)}</i></p></div>`
          : `<p class="prompt">tap to show name</p>`
      }
    </section>
  `;
}

async function loadImageProvenance(path: string) {
  const response = await fetch(assetUrl(path));

  if (!response.ok) {
    throw new Error(`Could not load image provenance: ${path}`);
  }

  return response.json() as Promise<ImageProvenance>;
}

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => htmlEscapes[character]);
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
