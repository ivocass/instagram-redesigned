
// paths to the icons
const OPEN_MEDIA_ICON_SOURCE = chrome.runtime.getURL("assets/open-media.png");

// we reuse the buttons intead of creating them every time
let openMediaButton;

init();

function init() {
	
	addEventListener("keydown", keydownListener);



	openMediaButton = document.createElement("button");
	openMediaButton.id = "open-media-button";
	openMediaButton.title = "Open media in new tab";
	openMediaButton.addEventListener("click", openMediaButtonClickListener);
	document.addEventListener("mouseover", mouseOverListener);

	// button icon
	let openMediaImg = document.createElement("img");
	openMediaImg.src = OPEN_MEDIA_ICON_SOURCE;
	openMediaButton.appendChild(openMediaImg);
}



function mouseOverListener(e) {
	// check if we should add or remove the open media button when viewing a story
	if (window.location.pathname.startsWith("/stories/")) {
		let storyContainer = document.querySelector("._ac0a");
		
		if (!storyContainer) {
			return;
		}

		let bounds = storyContainer.getBoundingClientRect();
		
		// if we're inside the bounds of the story media (bounds increased by one pixel to make
		// sure it works)
		if (
			e.clientX >= bounds.left - 1 &&
			e.clientX <= bounds.right + 1 &&
			e.clientY >= bounds.top - 1 &&
			e.clientY <= bounds.bottom + 1
		) {
			
			// if we're over the story media and the button is not added
			if (!storyContainer.contains(openMediaButton)) {
				
				storyContainer.appendChild(openMediaButton);
				openMediaButton.classList.add('story');
			}
		} else {
			
			if (openMediaButton.parentElement) {
				
				openMediaButton.parentElement.removeChild(openMediaButton);
			}
		}

		return;
	}

	// if it's a child of a grid, don't show the button (in case we're on a profile page)
	if (e.target.closest("._aa-i")) {
		return;
	}

	// ignore the button itself. otherwise hovering it would end up removing it
	if (e.target === openMediaButton || e.target === openMediaButton.firstChild) {
		return;
	}

	// if hovering a post with an image or a post with a video
	if (e.target.classList.contains("_aagw") || (e.target.classList.contains("_aakl") && getIsViewingSinglePost())) {
		e.target.appendChild(openMediaButton);
		openMediaButton.classList.remove('story');
	} else {
		if (openMediaButton.parentElement) {
			openMediaButton.parentElement.removeChild(openMediaButton);
		}
	}
}

function getIsViewingSinglePost(){
	return window.location.pathname.includes("/p/");
}

// get the source for the image or video and open it in a new tab
function openMediaButtonClickListener(e) {
	e.preventDefault();

	// if viewing a story
	if (window.location.pathname.indexOf("/stories/") === 0) {
		let grandParent = document.querySelector("._ac0a");

		if (grandParent) {
			// assume the story contains a video, so search for a 'source' element
			let source = grandParent.querySelector("source");

			if (source) {
				// the timeout prevents a bug where the video starts playing and pausing indefinitely
				// this allows the click to go through and pause the original video.
				setTimeout(() => {
					window.open(source.src);
				}, 100);
			} else {
				// assume the story contains an image instead
				let img = grandParent.querySelector("img");

				if (img) {

					// if the image is being cropped into a square, use the first srcset url instead
					if (img.src.includes('/e35/c0.')) {
						window.open(img.srcset.slice(0,img.srcset.indexOf(' ')));
					}
					else{
						window.open(img.src);
					}
				}
			}
		}
	} else {
		// assume we're hovering a post with an image
		let grandParent = e.target.closest("._aagu");

		if (grandParent) {
			let img = grandParent.querySelector("img");

			if (img) {
				window.open(img.src);

				return;
			}
		}

		// assume we're hovering a post with a video
		grandParent = e.target.closest("article");

		// if it's a single post
		if (grandParent && window.location.pathname.includes('/p/')) {

			
			let vid = grandParent.querySelector("video");

			if (vid) {
				window.open(vid.src);

				return;
			}

			return;
			
			// add the code that will return the video's data
			let url = window.location +  '?__a=1';
		
			fetch(url)
			.then(res => res.json())
			.then(obj =>{
				
				// get the video's url, then open it in a new tab
				if (obj && obj.items && obj.items[0]) {
					
					// if video_versions is directly accessible
					if (obj.items[0].video_versions && obj.items[0].video_versions[0]) {
						url =  obj.items[0].video_versions[0].url;
					}
					else
					// check if it's inside carousel_media
					if (obj.items[0].carousel_media && obj.items[0].carousel_media[0].video_versions
						&& obj.items[0].carousel_media[0].video_versions[0]) {
						
						url = obj.items[0].carousel_media[0].video_versions[0].url;
					}
					else{
						console.error('Redesign for Instagram - video_versions not available');
					}					
					
					if (url.startsWith('https://instagram')) {
								
						window.open(url)
					}
				}
			})
			.catch(err => 
			console.error('Redesign for Instagram - Error fetching video data'));
		}
	}
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
