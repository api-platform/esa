import ld, { resources } from "@api-platform/ld";
import mercure from "@api-platform/mercure";
import { URLPattern } from "urlpattern-polyfill";
let books = undefined

const pattern = new URLPattern(window.origin+'/(books|authors)/:id')
// Fetch fn for @api-platform/ld that calls mercure and keeps a copy on the initial JSON
const fetchFn = (url) => {
  return mercure(url, {
    onUpdate: (data) => {
      resources.set(data['@id'], data)
      updateView(books)
    }
  })
  .then(d => {
    return d.json()
  })
}

// on data update updates the json, it also keeps a map of resources to update via mercure
function onUpdate(obj, { iri, data }) {
  books = obj
  updateView(obj)
}

ld('/books', { fetchFn: fetchFn, urlPattern: pattern, onUpdate })
  .then(d => {
    books = d
    updateView(d)
  })


function updateForm() {
  const select = document.getElementById('resources')
  select.innerHTML = "";
  resources.forEach((value, key) => {
    const option = document.createElement('option')
    option.innerText = key
    select.appendChild(option)
  });
  const d = resources.get(select.value)
  if (d) {
    document.getElementById('data').value = JSON.stringify(d, null, 2)
  }
}

function clone(d) {
  return JSON.parse(JSON.stringify(d))
}

// update the view
function updateView(d) {
  const copy = addLinks(clone(d))
  document.getElementById('json').innerHTML = JSON.stringify(copy, null, 2)
  updateForm()
}

// shortcut to get the clone's current pointer
function getValueAtKey(keys) {
  let current = clone
  keys.forEach((e, i) => {
    if (i === keys.length - 1) {
      return
    }

    current = current[e]
  })

  return current
}

// Main function that calls the property getter on click on a link
window.openLink = (event) => {
  event.preventDefault()
  const k = event.target.dataset.key
  const keys = k.split(',')
  // calls the getter, it'll run a fetch if data isn't in the cache
  let acc = books
  keys.forEach((e) => acc = acc[e])
}

// Adds <a href> to our JSON
function addLinks(d, k) {
  Object.keys(d).forEach((i) => {
    const key = !k ? i : i === '@id' ? k : `${k},${i}`
    const e = d[i]
    if (null !== e && typeof e === 'object') {
      d[i] = addLinks(e, key)
      return
    }

    if (i !== '@id' && resources.has(e)) {
      d[i] = addLinks(clone(resources.get(e)), key)
      return
    }

    if (typeof e !== 'string') {
      return 
    }

    let absoluteValue = `${pattern.protocol}://${pattern.hostname}${pattern.port ? ':'+pattern.port : ''}${e}`;
    if (pattern.test(absoluteValue)) {
      d[i] = `<a onclick='openLink(event)' data-key='${key}' class='text-blue-600 dark:text-blue-500 hover:underline' href='${e}'>${e}</a>`;
    } else if (e && e.startsWith('https')) {
      d[i] = `<a target='_blank' class='text-green-600 dark:text-green-500 hover:underline' href='${e}'>${e}</a>`;
    }
  })

  return d
}

// mercure submit
window.handleSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  fetch(formData.get('topic'), {
    method: 'PUT',
    body: formData.get('data'),
    headers: {
      'Content-Type': 'application/ld+json'
    }
  })
}

window.selectResource = function() {
  const select = document.getElementById('resources')
  const d = resources.get(select.value)
  document.getElementById('data').value = JSON.stringify(d, null, 2)
}

