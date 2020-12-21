import './AboutPage.scss';

export default function AboutPage() {
  return (
    <section className="about-page">
      <h1>Weft!</h1>
      <h2>An experimental, offline-first* self recording web app</h2>

      <p>
        Awesome backgrounds from <a href="https://www.svgbackgrounds.com/">SVGBackgrounds.com</a>
      </p>
      <p>
        Icons from <a href="https://icons.getbootstrap.com/">Bootstrap Icons</a>
      </p>

      <p>
        <strong>*</strong> At the moment, this app is offline <em>*only*</em>; all the data is saved
        to your{' '}
        <a title="IndexedDB" href="https://developer.mozilla.org/en-US/docs/Glossary/IndexedDB">
          browser's own storage spage
        </a>
        .
      </p>
    </section>
  );
}
