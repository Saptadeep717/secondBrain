interface componentType {
  cardClass: string;
  link: string;
}

const YoutubeComponent = ({ cardClass, link }: componentType) => {
  function getYouTubeEmbedUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Handle standard watch links: https://www.youtube.com/watch?v=VIDEO_ID
      if (
        parsedUrl.hostname.includes("youtube.com") &&
        parsedUrl.searchParams.get("v")
      ) {
        return `https://www.youtube.com/embed/${parsedUrl.searchParams.get(
          "v"
        )}`;
      }
      // Handle short links: https://youtu.be/VIDEO_ID
      if (parsedUrl.hostname === "youtu.be") {
        return `https://www.youtube.com/embed${parsedUrl.pathname}`;
      }

      // If it’s already an embed link
      if (parsedUrl.pathname.startsWith("/embed/")) {
        return url;
      }

      // Default fallback
      return url;
    } catch {
      // If something goes wrong (invalid URL)
      return url;
    }
  }

  return (
    <div className={cardClass}>
      <iframe
        className="w-full aspect-video rounded-lg"
        src={getYouTubeEmbedUrl(link)}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default YoutubeComponent;
