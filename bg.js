import { getWallpaper, setWallpaper } from "wallpaper";
import { writeFile } from "fs/promises";
import path from "path";
import axios from "axios";
import Handlebars from "handlebars";
import nodeHtmlToImage from "node-html-to-image";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { parseSrcset } from "srcset";

// CONFIG
const WALLPAPER_WIDTH = 2560;
const WALLPAPER_HEIGHT = 1440;

// Constants
const fileUrl = import.meta.url;
const filePath = fileURLToPath(fileUrl);
const dirPath = path.dirname(filePath);
const HTML_FILE = path.join(dirPath, "wallpaper.html");
const IMG_FILE = path.join(dirPath, "potd.jpg");

// CSS template
const CSS_TEMPLATE = `
body {
    margin: 0;
    position: relative;
    width: 1920px;
    height: 1080px;
    background-color: black;
    color: #ffffffa8;
    font-family: Helvetica;
}
.img {
    object-fit: contain;
    width: 100%;
    height: 100%;
}

.bg-img {
    position: absolute;
    height: 1080px;
    z-index: -1;
    filter: blur(300px);
    max-width: initial;
    max-height: initial;
    width: 1920px;
    opacity: 0.7;
}
.desc {
    position: absolute;
    bottom: 0;
    text-align: center;
    background-color: #000000a8;
    width: 1920px;
}
h1 {
    font-size: {{title_font_size}}px;
    margin: 0;
}
p {
    font-size: {{desc_font_size}}px;
    margin: 0;
}
`;

// HTML template
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wikipedia Picture of the Day</title>
    <style>
        {{{css}}}
    </style>
</head>
<body class="container">
        <img class="bg-img" src="{{src}}" alt="Background Image">
        <img class="img" src="{{src}}" alt="{{title}}">
        <div class="desc">
            <h1>{{title}}</h1>
            <p>{{description}}</p>
        </div>
</body>
</html>
`;

async function fetchWikipediaPotd() {
  const url = "https://en.wikipedia.org/wiki/Wikipedia:Picture_of_the_day";
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const srcset_str = $("#mp-tfp img").attr("srcset").replace("//", "https://");
  const srcset = parseSrcset(srcset_str);
  let src = srcset[srcset.length - 1].url;
  if (src.startsWith("//")) {
    src = "https:" + src;
    src = src.replace('/thumb', '').replace(/\/[^\/]*$/, '');
  }
  const title = $("a.mw-file-description").attr("title");
  const desc_elem = $("#mp-tfp p");
  const description = desc_elem.length
    ? desc_elem.text()
    : "No description available.";

  return { srcset, src, title, description };
}

async function generateWallpaper(src, srcset, title, description, css_params) {
  const cssTemplate = Handlebars.compile(CSS_TEMPLATE);
  const css = cssTemplate(css_params);

  const htmlTemplate = Handlebars.compile(HTML_TEMPLATE);
  const html = htmlTemplate({ css, src, srcset, title, description });

  try {
    await writeFile(HTML_FILE, html);
    console.log(`Wallpaper HTML file created: ${HTML_FILE}`);

    await nodeHtmlToImage({
      output: IMG_FILE,
      html: html,
      puppeteerArgs: {
        defaultViewport: {
          width: WALLPAPER_WIDTH,
          height: WALLPAPER_HEIGHT,
        },
      },
    });
  } catch (error) {
    console.error("Error in generateWallpaper:", error);
  }
}

async function main() {
  try {
    const { src, srcset, title, description } = await fetchWikipediaPotd();

    const css_params = {
      width: WALLPAPER_WIDTH,
      height: WALLPAPER_HEIGHT,
      bg_color: "black",
      text_color: "#ffffffa8",
      title_font_size: 46,
      desc_font_size: 18,
    };

    await generateWallpaper(src, srcset, title, description, css_params);
    await setWallpaper(IMG_FILE);

    console.log(`Wallpaper created and set: ${IMG_FILE}`);
    console.log(`HTML file (for reference): ${HTML_FILE}`);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();