var Auth = ''

async function getRepo(owner, name, select) {
    const response = await fetch("https://api.github.com/graphql", {
        method: 'POST',
        headers: {
            'Authorization': Auth,
        },
        body: JSON.stringify({ "query": `{repository(owner: \"${owner}\", name: \"${name}\")${select}}` })
    })
    return await response.json()
}

const selectRepoLink = "owner{login},name,url"

const selectRepo = `${selectRepoLink},descriptionHTML,stargazerCount,forkCount,
    diskUsage,createdAt,updatedAt,pushedAt,
    isFork,parent{${selectRepoLink}},
    languages(first:50){totalSize,edges{size,node{name,color}}}`


function displayUserLink(owner) {
    return `<a target="_blank" href="https://github.com/${owner.login}">${owner.login}</a>`
}

function displayRepoLink(repo) {
    return `${displayUserLink(repo.owner)}/<a target="_blank" href="${repo.url}">${repo.name}</a>`
}

function displayRepo(repo) {
    return `
        ${displayRepoLink(repo)}
        stars:${repo.stargazerCount} forks:${repo.forkCount}  
        <span style="display:inline-block">disk&nbsp;usage:${repo.diskUsage/1000}MB</span>
        languages: ${displayLanguages(repo.languages)}
        ${displayForkedFrom(repo)}
        ${displayDescription(repo)} 
        <p>
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
            <div style="border: 1px solid black;color:gray">
                ${displayRepoLink(repo)}
            </div>`
            return
        }
        out += `
            <div style="border: 1px solid black;">
                ${displayRepo(repo)}
                <a href="home.html?owner=${repo.owner.login}&name=${repo.name}"><button>walk from here</button></>
            </div>`
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
    return `<div>
    ${displayUserLink(edge.node)} stared this repo on ${edge.starredAt.substring(0,10)}
     and recently contribued to ${edge.node.repositoriesContributedTo.totalCount} repos.
    <div>
        ${displayRepos(edge.node.repositoriesContributedTo.nodes, from)}
    </div>
    </div>`
}

function displayForkedFrom(repo) {
    if (!repo.isFork) {return ""}
    return `<div>forked from ${displayRepoLink(repo.parent)}</div>`
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
        out += `<span style="color:${e.node.color}">${e.node.name}</span>&nbsp;${Math.ceil(e.size/1000)/1000}MB `
    });
    return out
}

const params = new URLSearchParams(document.location.search)

let fromOwner = params.get("owner")
let fromName = params.get("name")
if (fromOwner === null) {
    fromOwner = "xiegeo"
    fromName = "modbusone"
}

function reload(){
    document.getElementById("from-repo").innerText = "loading..."
    Auth = document.getElementById("auth").value.trim()
    if (Auth == ""){
        document.getElementById("from-repo").innerHTML = `
            This app is self hosted in your browser.
            To access the GitHub GraphQL API,
            you need to provied it with a 
            <a target="_blank" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-personal-access-token-classic">
                Personal access token (classic)"</a>.
            We are only interisted in public data, so for available scopes, none is needed.
        `
        return
    }
    if (!Auth.startsWith("Bearer ")) {Auth = "Bearer " + Auth}
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
    }).catch((err) => {
        console.log('Fail:', err);
        document.getElementById("from-repo").innerText = err
    })
}


