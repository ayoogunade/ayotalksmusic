import fs from "fs";
import sharp from "sharp";

const inputDir = "./images";
const outputDir = "./images_optimized";

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.readdirSync(inputDir).forEach(file => {
  if (file.endsWith(".jpg") || file.endsWith(".png")) {
    sharp(`${inputDir}/${file}`)
      .toFormat("webp", { quality: 80 })
      .toFile(`${outputDir}/${file.split(".")[0]}.webp`)
      .then(() => console.log(`Converted: ${file}`))
      .catch(err => console.error(err));
  }
});
