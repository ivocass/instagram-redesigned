// the localStorage key to remember the user's dark mode preference
const DARK_MODE_ITEM_KEY = "instagram-dark-mode-enabled";

// paths to the icons
const CHEVRON_ICON_SOURCE = chrome.runtime.getURL("assets/chevron.png");
const OPEN_MEDIA_ICON_SOURCE = chrome.runtime.getURL("assets/open-media.png");
const DARK_THEME_ICON_SOURCE = chrome.runtime.getURL("assets/dark-theme-icon.png");

// we reuse the buttons intead of creating them every time
let prevStoriesButton;
let nextStoriesButton;
let openMediaButton;
let darkThemeButton;

// classes to target the real buttons that cycle the stories in Home
const PREV_BUTTON_CLASSES = "._aahh._aahj._aahm";
const NEXT_BUTTON_CLASSES = "._aahi._aahj._aahm";

let intervalId = -1;

init();

function init() {
	// use the timer only when the tab is active
	window.addEventListener("focus", addInterval);
	window.addEventListener("blur", removeInterval);
	addEventListener("keydown", keydownListener);

	//addInterval();

	// story-cycling buttons
	prevStoriesButton = document.createElement("button");
	nextStoriesButton = document.createElement("button");

	prevStoriesButton.id = "custom-prev-stories-button";
	nextStoriesButton.id = "custom-next-stories-button";
	prevStoriesButton.className = "custom-stories-button";
	nextStoriesButton.className = "custom-stories-button";

	prevStoriesButton.addEventListener("click", () => storyButtonClickListener("prev"));
	nextStoriesButton.addEventListener("click", () => storyButtonClickListener("next"));

	// the chevron icons
	let prevImg = document.createElement("img");
	let nextImg = document.createElement("img");
	prevImg.id = "custom-prev-stories-button-img";
	nextImg.id = "custom-next-stories-button-img";
	prevImg.src = CHEVRON_ICON_SOURCE;
	nextImg.src = CHEVRON_ICON_SOURCE;
	prevImg.className = "custom-stories-button-img disabled";
	nextImg.className = "custom-stories-button-img";

	prevStoriesButton.appendChild(prevImg);
	nextStoriesButton.appendChild(nextImg);

	openMediaButton = document.createElement("button");
	openMediaButton.id = "open-media-button";
	openMediaButton.title = "Open media in new tab";
	openMediaButton.addEventListener("click", openMediaButtonClickListener);
	document.addEventListener("mouseover", mouseOverListener);

	// button icon
	let openMediaImg = document.createElement("img");
	openMediaImg.src = OPEN_MEDIA_ICON_SOURCE;
	openMediaButton.appendChild(openMediaImg);

	darkThemeButton = document.createElement("button");
	darkThemeButton.id = "toggle-dark-theme-button";

	let darkThemeButtonIcon = document.createElement("img");
	darkThemeButtonIcon.src = DARK_THEME_ICON_SOURCE;
	darkThemeButton.appendChild(darkThemeButtonIcon);

	let darkThemeButtonText = document.createElement("span");
	darkThemeButtonText.innerText = "Dark mode";

	darkThemeButton.appendChild(darkThemeButtonText);

	darkThemeButton.addEventListener("click", toggleDarkTheme);

	// check the user's dark mode preference and activate dark mode if necessary
	if (localStorage.getItem(DARK_MODE_ITEM_KEY) === "true" && 
	window.location.href.indexOf('theme=dark')  === -1) toggleDarkTheme();

	// if the user clicked on the nav bar avatar button, we add the Dark Mode button
	// to the user options menu
	document.addEventListener("click", (e) => {
		
		if (e.target.tagName == "IMG" && e.target.classList.contains("_aa8j")) {
			
			// delay adding the button to allow the menu to render
			setTimeout(addDarkThemeButton, 10);
		}
	});
}

function addDarkThemeButton() {
	let optionsMenu = document.querySelector("._aa61");

	if (!optionsMenu) {
		return;
	}

	// insert our button above the 'Settings' button
	optionsMenu.insertBefore(darkThemeButton, optionsMenu.children[2]);
}


// check if we should add the custom story-cycling buttons
function addInterval() {
	// don't add the inverval twice
	if (intervalId !== -1) {
		return;
	}

	intervalId = setInterval(() => {
		// if one of our custom buttons is on screen
		if (document.querySelector(".custom-stories-button")) {
			return;
		}

		// look for the stories container. if not on the screen, no need to add our buttons
		if (!document.querySelector(".ku8Bn")) {
			return;
		}

		showStoryButtons();
	}, 1000);
}

function removeInterval() {
	clearInterval(intervalId);
	intervalId = -1;
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

function onLoaded(){
	
	window.location.reload()

	window.removeEventListener("load", onLoaded);
	
}

function showStoryButtons() {
	let buttonsParent = document.querySelector("._aam1._aam2._aam3._aam5");

	if (buttonsParent) {
		buttonsParent.appendChild(prevStoriesButton);
		buttonsParent.appendChild(nextStoriesButton);

		prevStoriesButton.classList.add("fade-in");
		nextStoriesButton.classList.add("fade-in");
	}
}

// forward the click to the real button, which is hidden
function storyButtonClickListener(type) {
	let classes = type === "prev" ? PREV_BUTTON_CLASSES : NEXT_BUTTON_CLASSES;

	let realBtn = document.querySelector(classes);

	// better with debounce but it's fine
	setTimeout(updateButtonsStyle, 1000);

	if (!realBtn) {
		return;
	}

	realBtn.click();
}

// this check is made only after using the prev/next stories buttons. if it was done
// in the permanent interval, it would consume more resources.
function updateButtonsStyle() {
	updateButtonStyle(PREV_BUTTON_CLASSES, "#custom-prev-stories-button-img");
	updateButtonStyle(NEXT_BUTTON_CLASSES, "#custom-next-stories-button-img");
}

// show the button as enabled and disabled when appropriate.
function updateButtonStyle(realBtnClass, buttonImgId) {
	let realBtn = document.querySelector(realBtnClass);
	let btnImg = document.querySelector(buttonImgId);

	// if the real button exists, show ours as enabled
	if (realBtn) {
		if (btnImg) {
			btnImg.style.opacity = 1;

			btnImg.parentElement.classList.remove("disabled");
		}
	} else {
		if (btnImg) {
			btnImg.style.opacity = 0.4;
			btnImg.parentElement.classList.add("disabled");
		}
	}
}

// add or remove the class "dark-theme" from body and change a css variable in :root
function toggleDarkTheme() {
	
	let newUrl = new URL(window.location.href);

	if (window.location.href.indexOf('theme=dark') > -1) {
				
		localStorage.setItem(DARK_MODE_ITEM_KEY, "false");

		newUrl.searchParams.delete('theme');		
		
	} else {
		
		localStorage.setItem(DARK_MODE_ITEM_KEY, "true");

		newUrl.searchParams.append('theme', 'dark');
	}

	window.location.replace(newUrl.href)
}


/**
 * Listen for the keys J and K on the homepage, then scroll to the next or previous post.
 * Also listen for M (to toggle sound in stories)
 */
function keydownListener(e){

	const key = e.key.toUpperCase();

	if (key === 'M' && window.location.pathname.startsWith("/stories/") && 
	e.target.tagName !== "TEXTAREA" &&
	e.target.tagName !== 'INPUT'){
		
		
		toggleStoryMute()
		return;
	}
	
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


function toggleStoryMute(){

	// we use this technique instead of targetting css classes because the classes will eventually
	// change.
	let el = document.querySelector('header');

	if (!el) {
		console.warn('toggleStoryMute() - header not found')
		return;
	}

	el = el.childNodes[1];

	if (!el) {
		console.warn('toggleStoryMute() - header child not found')
		return;
	}

	el = el.childNodes[1];

	if (!el) {
		console.warn('toggleStoryMute() - header grandchild not found')
		return;
	}

	el = el.childNodes[1];

	if (!el) {
		console.warn('toggleStoryMute() - mute button not found')
		return;
	}

	el.click();
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
