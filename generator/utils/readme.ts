import type { ImagePiece } from '#types';
import { hash } from 'hasha';
import zip from 'just-zip-it';
import fs from 'node:fs';
import os from 'node:os';
import { outdent } from 'outdent';
import path from 'pathe';
import sharp from 'sharp';
import { monorepoDirpath } from './paths.ts';
// @ts-expect-error: bad typings
import { convert2img } from 'mdimg';

export async function generateReadmeMarkdownFile({
	imageWidth,
	darkModeImagePieces,
	lightModeImagePieces,
	lightModeReadmeMdImageFilepath,
	darkModeReadmeMdImageFilepath,
}: {
	imageWidth: number;
	darkModeImagePieces: ImagePiece[];
	lightModeImagePieces: ImagePiece[];
	lightModeReadmeMdImageFilepath: string;
	darkModeReadmeMdImageFilepath: string;
}) {
	// We use GitHub pages to host our static images since it seems like that's more
	// reliable compared to using `raw.githubusercontent.com` URLs.
	const getImagePieceSrc = (
		{ filepath, imgSrc, theme }: ImagePiece & { theme: 'light' | 'dark' },
	) =>
		`https://nvminh162.github.io/nvminh162/generator/generated/${
			imgSrc === undefined ?
				path.basename(filepath) :
				imgSrc.replace(
					'${README_MD_SRC}',
					path.basename(
						theme === 'light' ?
							lightModeReadmeMdImageFilepath :
							darkModeReadmeMdImageFilepath,
					),
				)
		}`;

	const getImgWidth = (width: number) => `${(width / imageWidth) * 100}%`;

	const readmeFooter = outdent({ trimLeadingNewline: false })`
	###
	![](https://komarev.com/ghpvc/?username=nvminh162&color=ff69b4) 
	![](https://custom-icon-badges.demolab.com/github/followers/nvminh162?logo=person-add&style=social&logoColor=black) 
	![](https://custom-icon-badges.demolab.com/github/stars/nvminh162?logo=star&style=social&logoColor=black)
	<!-- /antonkomarev/github-profile-views-counter --> 
	<!-- buff -> &base=1000 -->

	<details>
	<summary><h2>My Skill</h2></summary> 
	<div align="center">
		Updating ...
	</div>
	</details>

	<details>
	<summary><h2>My stats</h2></summary> 
	<div align="center">
		<img src="https://github-readme-stats.vercel.app/api?username=nvminh162&show_icons=true&theme=dracula" alt="Githubstat" title="GithubStat" height="192px"/>
		<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=nvminh162&layout=compact&theme=dracula" alt="TopLanguages" title="TopLanguages" height="192px"/>
		<!-- <a href="https://git.io/streak-stats"><img src="https://streak-stats.demolab.com?user=nvminh162&theme=dracula&hide_border=true&short_numbers=true&date_format=M%20j%5B%2C%20Y%5D" alt="GitHub Streak" /></a> -->
		<img src="https://github-readme-activity-graph.vercel.app/graph?username=nvminh162&theme=dracula" alt="activityContribution" title="activityContribution"/>
		<img src="https://github-profile-trophy.vercel.app/?username=nvminh162&theme=dracula" alt="trophyProfileGithub" title="trophyProfileGithub"/>
	</div>
	</details>

	<summary><h2>Quotes</h2></summary> 
	<div align="center">

	![](https://quotes-github-readme.vercel.app/api?type=horizontal&theme=radical)

	</div>

	<div align="center">
		<img src="https://github.com/thanhtin4401/thanhtin4401/assets/85281544/a65ececb-7042-4a69-b9a6-71381c48b003" alt="giphy" />
	</div>

	<h3 align="center">
		<img src="https://readme-typing-svg.herokuapp.com/?font=Righteous&size=25&center=true&vCenter=true&width=500&height=70&duration=4000&lines=Thanks+for+visiting!+✌️;+Sho+me+a+message+on+Linkedin!;I'm+always+down+to+collab+:)">
	</h3>

	<!-- written by @nvminh162 -->
	`;

	const readme = zip(lightModeImagePieces, darkModeImagePieces).map(
		([lightModeImagePiece, darkModeImagePiece]) => {
			const { href } = lightModeImagePiece;
			const imgWidth = getImgWidth(lightModeImagePiece.width);
			const lightModeImgSrc = getImagePieceSrc({
				...lightModeImagePiece,
				theme: 'light',
			});
			const darkModeImgSrc = getImagePieceSrc({
				...darkModeImagePiece,
				theme: 'dark',
			});

			const pictureHtml = outdent`
				<picture><source media="(prefers-color-scheme: light)" srcset="${lightModeImgSrc}"><source media="(prefers-color-scheme: dark)" srcset="${darkModeImgSrc}"><img src="${lightModeImgSrc}" width="${imgWidth}" /></picture>
			`;

			const markdown = href === null ?
				pictureHtml :
				`<a href="${href}">${pictureHtml}</a>`;

			return markdown;
		},
	).join('') + readmeFooter;

	await fs.promises.writeFile(
		path.join(monorepoDirpath, '../readme.markdown'),
		readme,
	);
}

export async function convertReadmeMdToImage({
	imageWidth,
	imageHeight,
	theme,
}: {
	imageWidth: number;
	imageHeight: number;
	theme: 'light' | 'dark';
}) {
	const img = await convert2img({
		mdFile: path.join(monorepoDirpath, '../README.md'),
		outputFilename: await os.tmpdir(),
		width: imageWidth,
		height: imageHeight,
		cssTemplate: theme === 'light' ? 'github' : 'githubdark',
	});

	const imgHash = await hash(img.data);
	const image = sharp(img.data);
	const { width, height } = await image.metadata();
	if (!width || !height) {
		throw new Error('Could not get image dimensions');
	}

	const readmeMdImageFilepath = path.join(
		monorepoDirpath,
		`generated/readme-${theme}.${imgHash}.png`,
	);

	await image
		.resize(369, 230)
		.extract({
			left: 1,
			top: 1,
			width: 369 - 2,
			height: 230 - 2,
		})
		.extend({
			top: 1,
			bottom: 1,
			left: 1,
			right: 1,
			background: theme === 'light' ? '#000000' : '#EEEEEE',
		}).toFile(readmeMdImageFilepath);

	return readmeMdImageFilepath;
}
