/*
 * Credit to
 * https://github.com/HOAIAN2/Instagram-Downloader/blob/254ed349b0f655593e679a174c92c65d68fbfca5/src/js/story.js#L11
*/

class InstagramAPIUtils{

    constructor(){
    }

    getURLElements(){
        const regex = /\/(stories)\/(.*?)\/(\d*?)\//
        const page = window.location.pathname.match(regex)
        return page;
    }

    getUsername() {
       return this.getURLElements()[2];
    }

    getStoryId() {
        return this.getURLElements()[3];
    }

    getOptions(){
        const csrftoken = document.cookie.split(' ')[2].split('=')[1]
        const claim = sessionStorage.getItem('www-claim-v2')
        const options = {
            headers: {
                'x-asbd-id': '198387',
                'x-csrftoken': csrftoken,
                'x-ig-app-id': '936619743392459',
                'x-ig-www-claim': claim,
                'x-instagram-ajax': '1006598911',
                'x-requested-with': 'XMLHttpRequest'
            },
            referrer: 'https://www.instagram.com',
            referrerPolicy: 'strict-origin-when-cross-origin',
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
        }

        return options;
    }

    async getUserID(options, username) {
        const apiURL = new URL('/api/v1/users/web_profile_info/', 'https://www.instagram.com')
        apiURL.searchParams.set('username', username)
        try {
            const response = await fetch(apiURL.href, options)
            const json = await response.json()
            return json.data.user['id']
        } catch (error) {
            console.log(error)
            return ''
        }
    }

    async getStoriesData(userID, options) {
        const apiURL = new URL('/api/v1/feed/reels_media/', 'https://www.instagram.com')
        apiURL.searchParams.set('reel_ids', userID)
        try {
            const respone = await fetch(apiURL.href, options)
            const json = await respone.json()
            return json.reels[userID]
        } catch (error) {
            console.log(error)
            return null
        }
    }
}