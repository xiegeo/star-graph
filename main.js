var Auth = sessionStorage.getItem("Auth");

async function query(body) {
    const resp = await fetch("https://api.github.com/graphql", {
        method: 'POST',
        headers: {
            'Authorization': Auth,
        },
        body: JSON.stringify({ "query": `{${body},${selectRateLimit}}` })
    })
    const jsonResp = await resp.json()
    if (jsonResp.data?.rateLimit !== null) {
        document.getElementById("rate-limit").innerHTML = displayRateLimit(jsonResp.data?.rateLimit)
    }else{
        document.getElementById("rate-limit").innerHTML = ""
    }
    return jsonResp
}

async function getRepo(owner, name, select) {
    if (owner === null) {
        const resp = await query(`viewer{
            pinnedItems(first:6, types:REPOSITORY){
              nodes{ ... on Repository{
                owner{login}
                name
            }}}}`)
        if (resp.data == null) {
            throw JSON.stringify(data)
        }
        var content = ""
        if (resp.data.viewer.pinnedItems.nodes.length === 0) {
            content += `You don't have any repos pinned to your account. But`
        }else{
            content += `Start from your pins:<ul>${displayPinList(resp.data.viewer.pinnedItems.nodes)}</ul> Or,`
        }
         document.getElementById("from-repo").innerHTML = content +
            ` you can start with one of these:
            <ul>
                <li> <a href="?owner=git&name=git">git/git</a>
                <li> <a href="?owner=github&name=opensource.guide">github/opensource.guide</a>
                <li> <a href="?owner=golang&name=go">golang/go</a>
                <li> <a href="?owner=mdn&name=content">mdn/content</a>
                <li> <a href="?owner=graphql&name=graphql-spec">graphql/graphql-spec</a>
                <li> <a href="?owner=xiegeo&name=star-graph">xiegeo/star-graph</a>
            </ul>`
        throw "" // this is ok
    }
    return await query(`repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)})${select}`)
}

const selectRepoLink = "owner{login},name,url"

const selectRepo = `${selectRepoLink},descriptionHTML,stargazerCount,forkCount,
    diskUsage,createdAt,updatedAt,pushedAt,
    isFork,parent{${selectRepoLink}},
    languages(first:50){totalSize,edges{size,node{name,color}}}`

const selectRateLimit = `rateLimit{limit,cost,remaining,resetAt}`


function displayUserLink(owner) {
    return `<a target="_blank" href="https://github.com/${owner.login}">${owner.login}</a>`
}

function displayRepoLink(repo) {
    return `${displayUserLink(repo.owner)}/<a target="_blank" href="${repo.url}">${repo.name}</a>`
}

function displayPinList(pinNodes) {
    var out = ""
    pinNodes.forEach(pin => {
        out += `<li> <a href="?owner=${pin.owner.login}&name=${pin.name}">${pin.owner.login}/${pin.name}</a>`
    });
    console.log(pinNodes)
    return out
}

function displayRepo(repo) {
    return `
        ${displayRepoLink(repo)}
        <span>stars:${repo.stargazerCount} forks:${repo.forkCount}</span>
        ${displayForkedFrom(repo)}
        ${displayDescription(repo)} 
        <p style="color:${secondText()}">disk&nbsp;usage:${repo.diskUsage/1000}MB
        languages: ${displayLanguages(repo.languages)}
        <p style="color:${secondText()}">
        created:${repo.createdAt.substring(0,10)}
        last updated:${repo.updatedAt.substring(0,10)}
        last pushed:${repo.pushedAt.substring(0,10)}
    ` //code size:${Math.ceil(repo.languages.totalSize/1000)/1000}MB repo
}

function displayRepos(repos, from) {
    var out = ""
    repos.forEach(repo => {
        if (repo.url === from.url) {
            // hide from repo. see test case ?owner=xmake-io&name=xmake ?owner=freddier&name=hyperblog
            out += `
            <div style="border: 1px solid black;">
                ${displayRepoLink(repo)}
            </div>`
            return
        }
        out += `
                ${displayRepo(repo)}
                <a href="?owner=${repo.owner.login}&name=${repo.name}"><button>walk from here</button></a>
                <hr>
            `
    });
    return out
}

const selectPageInfo = `totalCount,pageInfo{endCursor,hasNextPage}`

function selectStarGazers() {
    var stars = 10
    var repos = 5
    return `stargazers(first:${stars} orderBy:{field:STARRED_AT,direction:DESC}){
        ${selectPageInfo}
        edges{
            starredAt
            node{ # a user
                login
                repositoriesContributedTo(first:${repos}){
                    ${selectPageInfo}
                    nodes{${selectRepo}}
                }
            }
        }
    }`
}

function displayStarGazers(gazers, from) {
    var out = ""
    gazers.edges.forEach(e => {
        out += displayStarGazer(e, from)
    });
    return out
}

function displayStarGazer(edge, from) {
    if (edge.node.repositoriesContributedTo.nodes.length == 0){
        return "" // hide star gazers without contributions
    }
    return `<section><h2 style="color:${secondText()}">
    ${displayUserLink(edge.node)} stared this repo on ${edge.starredAt.substring(0,10)}
     and recently contribued to ${edge.node.repositoriesContributedTo.totalCount} repos.</h2>
        ${displayRepos(edge.node.repositoriesContributedTo.nodes, from)}
    </section>`
}

function displayForkedFrom(repo) {
    if (!repo.isFork) {return ""}
    return `<p>forked from ${displayRepoLink(repo.parent)}`
}

function displayDescription(repo) {
    if (repo.descriptionHTML === null) {return ""}
    return `<p>${repo.descriptionHTML}`
}


function displayLanguages(langs) {
    if (langs.edges.length == 0) {
        return "None"
    }
    langs.edges.sort((a, b) => b.size-a.size) // sort by size, greatest first
    if (langs.edges.length > 5) {
       // could hide tails in languages here
    }
    var out = ""
    langs.edges.forEach(e => {
        out += `<span class="lang-name" data-color="${e.node.color}">${e.node.name}</span>&nbsp;`+
            `${Math.ceil(e.size/1000)/1000}MB `
    });
    return out
}

function displayRateLimit(rateLimit){
    return `<span style="color:${secondText()}">limit=${rateLimit.limit} cost=${rateLimit.cost} remaining=${rateLimit.remaining}
            resetAt=${new Date(rateLimit.resetAt).toLocaleTimeString()}</span>`
}

const params = new URLSearchParams(document.location.search)

function updateAuth(){
    Auth = document.getElementById("auth").value.trim()
    sessionStorage.setItem("Auth", Auth);
}

function reload(){
    document.getElementById("from-repo").innerText = "loading..."
    if (Auth === "" || Auth === null){
        document.getElementById("from-repo").innerHTML = `
            This app is self hosted in your browser.
            To access the GitHub GraphQL API,
            you need to provied it with a 
            <a target="_blank" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-personal-access-token-classic">
                Personal access token (classic)</a>.
            We are only interisted in public data, so for available scopes, none is needed.
        `
        return
    }
    if (!Auth.startsWith("Bearer ")) {Auth = "Bearer " + Auth}

    let fromOwner = params.get("owner")
    let fromName = params.get("name")

    getRepo(fromOwner, fromName, `{${selectRepo},${selectStarGazers()}}`)
    .then((data)=>{
        console.log('Got resp:', data)
        if (data.data == null) {
            throw JSON.stringify(data)
        }
        data = data.data
        x = data
        r = data.repository
        console.log('Success:', data.repository.descriptionHTML);
    
        document.getElementById("from-repo").innerHTML = displayRepo(data.repository)
        document.getElementById("list-stars").innerHTML = displayStarGazers(data.repository.stargazers, data.repository)
        updateLangName()
    }).catch((err) => {
        if (err === ""){
            console.log('no-op');
            return
        }
        console.log('Fail:', err);
        document.getElementById("from-repo").innerText = err
    })
}

var _secondTextColor = null
/**
 * secondText returns a color between canvas text and gray text
 */
function secondText() {
    //return "gray"
    if (_secondTextColor != null) {return _secondTextColor}
    _secondTextColor = Color.mix(
        window.getComputedStyle(document.getElementsByTagName("main")[0]).color,
        window.getComputedStyle(document.getElementById("grayText")).color,
        .7).to("srgb").toString()
    return _secondTextColor
}

/**
 * updateLangName uses data-color to decorate language names.
 * 
 * Uses the parent element's light component to convert data-color to display style color.
 */
function updateLangName() {
    Array.from(document.getElementsByClassName("lang-name")).forEach(e => {
        // console.log(e, e.dataset.color)
        if (e.dataset.color == "null") {
            // test cases ?owner=torvalds&name=linux ?owner=dail8859&name=NotepadNext
            console.log(e.textContent, `is missing data-color`)
            return
        }
        const parentColor = new Color(window.getComputedStyle(e.parentElement).color)
        const dataColor = new Color(e.dataset.color)
        var useColor = new Color(dataColor)
        useColor.oklab.l = parentColor.oklab.l
        e.style.color = useColor.toString()
        // console.log(e.textContent, parentColor, dataColor, useColor)
    });
}
