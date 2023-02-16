

// paths to the icons
const openMediaIconSource = chrome.runtime.getURL("assets/open-media.png");
const videoErrorMsg = 'Download unavailable for this video.\n Try https://snapinsta.app';


const openMediaButton = document.createElement("button");

const typeImage = 'typeImage';
const typeVideo = 'typeVideo';


init();

function init() {
	
	let openMediaImg = document.createElement("img");
	openMediaImg.src = openMediaIconSource;

	openMediaButton.id = "open-media-button";
	openMediaButton.title = "Open media in new tab";	
	openMediaButton.appendChild(openMediaImg);

	openMediaButton.addEventListener("click", openMediaButtonClickListener);
	document.addEventListener("keydown", keydownListener);
	document.addEventListener("mouseover", mouseOverListener);
}



function mouseOverListener(e) {

	// ignore the button itself (otherwise hovering it would end up removing it)
	if (e.target === openMediaButton || e.target === openMediaButton.firstChild) {
		return;
	}

	if (window.location.pathname.startsWith("/stories/")) {
        handleHoverStory(e);
	}
	else{
        handleHoverPost(e);
	}
}

function handleHoverStory(e){
	
	// get the current story (if there are many, the one enlarged)
	let storyContainer = document.querySelector("._ac0a");
	
	// ig changes the className every now and then
	if (!storyContainer) {
		return;
	}

	// we want to know if the story or its children are hovered
	storyContainer = storyContainer.querySelector(':hover');

	// if the story media nor its children are hovered
	if (!storyContainer) {

		if (openMediaButton.parentElement) {
			openMediaButton.remove();
		}
		return;
	}

	openMediaButton.classList.remove('invalid');   

	// if the button is not yet added
	if (!storyContainer.contains(openMediaButton)) {
				
		storyContainer.appendChild(openMediaButton);

		// adjust position
		openMediaButton.classList.add('story');
	}
}

function handleHoverPost(e){
	
	const el = e.target;	

	const postType = getPostType(el);

	if (postType === null) {

		if (openMediaButton.parentElement) {
			openMediaButton.remove();
		}

		return;
	}

	openMediaButton.classList.remove('invalid');

	// video targets don't have the actual video as a descendant
	if (postType === typeVideo) {
        const post = el.closest('article');

		if (!hasValidVideo(post)) {
			openMediaButton.classList.add('invalid');
		}
	}
	
	openMediaButton.classList.remove('story');
	el.appendChild(openMediaButton)
	
}

function getPostType(el){

	switch (true) {
	
		// img in feed and profile
		case el.matches('._aagw'):
			// ignore children of grids in user profile
			if (el.closest("article.x1iyjqo2")) {
				return null;
			}
			
			// ignore children of grids in "More posts from {user}"
			if (el.closest("._aa6g")) {
				return null;
			}
		return typeImage;

		// video in feed
		case el.matches('._aakl'):
		return typeVideo;

		// video in profile
		case el.matches('.x1ey2m1c.x9f619.xds687c.x10l6tqk.x17qophe.x13vifvy.x1ypdohk'):
		return typeVideo;
	}

	return null;

}

// videos with blob sources can only be downloaded manually via the Network debug panel
function hasValidVideo(el){

	const video = el.tagName.toUpperCase() === 'VIDEO' ? el : el.querySelector("video");
	
	if (video && video.src.startsWith('https://')) {
        return true;
	}
	
	return false;
}


// get the source for the image or video and open it in a new tab
function openMediaButtonClickListener(e) {
	
	// prevent video playback
	e.preventDefault();

	// don't use 'e.target', as it may be the icon inside the button
	let el = openMediaButton.parentElement;
	let source;
	
	// on posts sometimes the media is not a descendant
	if (!window.location.pathname.startsWith("/stories/")) {
		el = el.parentElement.parentElement.parentElement;		
	}
	
	let video = el.querySelector("video");

	if (video) {
		
		
		if (!hasValidVideo(video)) {

			// in the current function we handle only stories that aren't blobs.
			// if the video is not valid, then its a blob, so we delegate to fetchAndOpenStory()
			if (window.location.pathname.startsWith("/stories/")) {
				fetchAndOpenStory()
				return;
			}

			alert(videoErrorMsg)
			return;
		}

		source = video.src;
	}
	else{
		
		let img = el.querySelector("img");

		if (!img) {
			return;
		}

		source = img.src;		

		// if the image is being cropped into a square, use the first srcset url instead
		if (img.src.includes('/e35/c0.')) {
			source = img.srcset.slice(0,img.srcset.indexOf(' '));
			
		}
	}	

	// the timeout prevents a bug where the video starts playing and pausing indefinitely
	// this allows the click to go through and pause the original video.
	setTimeout(() => {
		window.open(source);
	}, 100);
}

/**
 * We use Instagram's API to fetch a json with URLs of the user's stories.
 * This works when the URL has this format: domain/{username}/{story id}
 */
async function fetchAndOpenStory(){

	
	const apiUtils = new InstagramAPIUtils();
	const username = apiUtils.getUsername();
	const storyId = apiUtils.getStoryId();
	const options = apiUtils.getOptions();
	const userId = await apiUtils.getUserID(options, username);
	const data = await apiUtils.getStoriesData(userId, options);


	if (!data || !data.items || data.items.length === 0) {
        
		alert(videoErrorMsg);
		return;
	}

	for(let i = 0; i < data.items.length; i++){
		const item = data.items[i];

		if (item.pk === storyId) {
        
			let url = item.video_versions[0].url;
			
			if (url && url.startsWith('https://')) {

				// some domains fail with a 'NotSameOrigin' error, but work with the modified domain
				url = modifyCDNURL(url)
				window.open(url);
				return;
			}
			break;
		}
	}

	alert(videoErrorMsg);
}

// this is what happens when you dont learn regex
function modifyCDNURL(url){
	
	// there are many servers, like 'fepa10-1', 'fepa10-2', etc
	if (url.startsWith('https://instagram.fepa10')) {
        let index = url.indexOf('.net/');

		if (index === -1) {
			return url;
		}

		index += 5;

		url = url.slice(index, url.length);

		url = 'https://scontent-ams4-1.cdninstagram.com/' + url;
	}

	return url;
}



/**
 * Listen for the keys J and K on the homepage, then scroll to the next or previous post.
 * Also listen for M (to toggle sound in stories)
 */
function keydownListener(e){

	const key = e.key.toUpperCase();
	
	// ignore input fields, only work on the homepage and for letters J,K,F,D
	if (e.target.tagName === "TEXTAREA" || 
		e.target.tagName === 'INPUT' || 
		window.location.pathname !== '/' || 
		(key !== 'J' && key !== 'K' && key !== 'F' && key !== 'D')) {
		
        return;
	}

	let posts = document.querySelectorAll('article');

	let targetPost = (key === 'J' || key === 'F') ? getNextPost(posts) : getPrevPost(posts);

	if (!targetPost) {
        return;
	}
	
	let rect = targetPost.getBoundingClientRect();

	let targetY = rect.top + window.pageYOffset - 60;	

	window.scrollTo({
		top: targetY,
		left: 0,
		behavior: 'smooth'
		});

}


/**
 * return the first post that has its top above the navbar
 */
function getPrevPost(posts){

	for(let i = posts.length - 1; i > -1; i--){

		let post = posts[i];

		var rect = post.getBoundingClientRect();

		if (rect.top < 59) {
			return post;
		}
	}

	return null;
}

/**
 * return the first post that has its top below the navbar
 */
function getNextPost(posts){

	for(let post of posts){

		var rect = post.getBoundingClientRect();

		if (rect.top > 61){
			return post;
		}

	}

	return null;
}
