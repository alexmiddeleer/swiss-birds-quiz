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
  commonsTitle?: string;
  credit: string;
  filePageUrl: string;
  licenseShortName: string;
  licenseUrl?: string;
};

type LoadProvenance = (path: string) => Promise<ImageProvenance>;
type Shuffle = <T>(arr: T[]) => T[];

function defaultShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderHomePage(
  root: HTMLElement,
  catalog: BirdCatalog = { birds: [] },
  loadProvenance: LoadProvenance = loadImageProvenance,
  shuffle: Shuffle = defaultShuffle,
) {
  root.innerHTML = `
    <section class="hero" aria-labelledby="app-title">
      <p class="eyebrow">Offline bird practice</p>
      <h1 id="app-title">Swiss Birds Quiz</h1>
      <button type="button">Start quiz</button>
    </section>
  `;

  root.querySelector("button")?.addEventListener("click", async () => {
    await renderQuiz(root, catalog, loadProvenance, shuffle);
  });
}

async function renderQuiz(
  root: HTMLElement,
  catalog: BirdCatalog,
  loadProvenance: LoadProvenance,
  shuffle: Shuffle,
) {
  const queue = shuffle(catalog.birds);
  const bird = queue[0];
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

  let roundQueue = queue.slice(1);

  async function showNextBird() {
    if (roundQueue.length === 0) {
      roundQueue = shuffle(catalog.birds);
    }
    const nextBird = roundQueue.shift()!;
    const nextImage = nextBird.images[0];
    const prov = await loadProvenance(nextImage.provenancePath);
    renderCard(nextBird, nextImage, prov, false);
  }

  function renderCard(b: Bird, img: BirdImage, prov: ImageProvenance, revealed: boolean) {
    root.innerHTML = quizMarkup(b, img, prov, revealed);
    if (!revealed) {
      root.querySelector(".quiz-card")?.addEventListener("click", () => {
        root.innerHTML = quizMarkup(b, img, prov, true);
        root.querySelector(".quiz-card")?.addEventListener("click", () => {
          void showNextBird();
        });
      });
    } else {
      root.querySelector(".quiz-card")?.addEventListener("click", () => {
        void showNextBird();
      });
    }
    root.querySelector("[data-action='end-quiz']")?.addEventListener("click", () => {
      renderHomePage(root, catalog, loadProvenance, shuffle);
    });
    root.querySelector("[data-action='refresh-app']")?.addEventListener("click", () => {
      window.location.reload();
    });
  }

  renderCard(bird, image, provenance, false);
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
      <figure class="quiz-card" tabindex="0" role="button" aria-label="${revealed ? "Show next bird" : "Reveal bird name"}">
        <img src="${assetUrl(image.path)}" alt="Bird to identify" />
        <figcaption class="citation">
          <span class="citation-title">${escapeHtml(provenance.commonsTitle ?? bird.commonName)}</span> ·
          Photo: ${escapeHtml(provenance.artist)} · ${escapeHtml(provenance.credit)} ·
          ${licenseMarkup(provenance)} ·
          <a href="${escapeAttribute(provenance.filePageUrl)}" target="_blank" rel="noreferrer">source</a>
        </figcaption>
      </figure>
      ${
        revealed
          ? `<div class="answer"><h2>${escapeHtml(bird.commonName)}</h2><p><i>${escapeHtml(bird.scientificName)}</i></p></div>
             <p class="prompt">tab bird to proceed</p>`
          : `<p class="prompt">tap to show name</p>`
      }
    </section>
    <div class="quiz-controls">
      <button type="button" data-action="end-quiz">End quiz</button>
      <button type="button" data-action="refresh-app">Refresh app</button>
    </div>
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

function licenseMarkup(provenance: ImageProvenance) {
  if (provenance.licenseUrl) {
    return `<a href="${escapeAttribute(provenance.licenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(provenance.licenseShortName)}</a>`;
  }

  return escapeHtml(provenance.licenseShortName);
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
