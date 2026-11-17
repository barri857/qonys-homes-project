let properties = [];
let words = {};
let language = readStorage('qonys-language', 'en');
let theme = readStorage('qonys-theme', 'light');
let favorites = readStorage('qonys-favorites', []);
let comparison = readStorage('qonys-compare', []);
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!['en', 'ru', 'kk'].includes(language)) language = 'en';
if (theme !== 'dark') theme = 'light';
if (!Array.isArray(favorites)) favorites = [];
if (!Array.isArray(comparison)) comparison = [];

document.documentElement.setAttribute('data-theme', theme);

function readStorage(key, fallback) {
  try {
    let value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function t(key, values) {
  let text = key;
  if (words.en && words.en[key]) text = words.en[key];
  if (words[language] && words[language][key]) text = words[language][key];
  if (values) {
    for (let name in values) {
      text = text.replaceAll('{' + name + '}', String(values[name]));
    }
  }
  return text;
}

function localText(value) {
  if (value && typeof value === 'object') return value[language] || value.en || '';
  return value || '';
}

function formatNumber(value) {
  let locale = 'en-GB';
  if (language === 'ru') locale = 'ru-KZ';
  if (language === 'kk') locale = 'kk-KZ';
  return Number(value).toLocaleString(locale);
}

function formatPrice(value) {
  return formatNumber(Math.round(value)) + ' ₸';
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function today() {
  let date = new Date();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function showToast(message) {
  let notice = $('<div class="notification"></div>').text(message);
  $('#toast-region').append(notice);
  if (reducedMotion) {
    setTimeout(function () { notice.remove(); }, 4000);
  } else {
    notice.hide().fadeIn(150).delay(3500).fadeOut(200, function () { notice.remove(); });
  }
}

function applyTheme() {
  $('html').attr('data-theme', theme);
  $('#theme-toggle').attr('aria-pressed', theme === 'dark');
  $('#theme-toggle').attr('aria-label', t(theme === 'dark' ? 'js.useLight' : 'js.useDark'));
}

function translatePage() {
  $('html').attr('lang', language);
  $('[data-i18n]').each(function () { $(this).text(t($(this).attr('data-i18n'))); });
  $('[data-i18n-placeholder]').each(function () { $(this).attr('placeholder', t($(this).attr('data-i18n-placeholder'))); });
  $('[data-i18n-aria]').each(function () { $(this).attr('aria-label', t($(this).attr('data-i18n-aria'))); });
  $('[data-i18n-alt]').each(function () { $(this).attr('alt', t($(this).attr('data-i18n-alt'))); });
  $('#language-select').val(language);
  let titleKeys = { home: 'nav.home', properties: 'nav.properties', saved: 'nav.saved', about: 'nav.about', contact: 'nav.contact' };
  document.title = t(titleKeys[$('body').attr('data-page')]) + ' | Qonys Homes';
  applyTheme();
}

function setupGeneralEvents() {
  $('#theme-toggle').on('click', function () {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    if (!saveStorage('qonys-theme', theme)) showToast(t('js.storageUnavailable'));
  });
  $('#language-select').on('change', function () {
    language = $(this).val();
    saveStorage('qonys-language', language);
    translatePage();
    renderProperties();
    updateFormLanguage();
    refreshOpenDialog();
  });
  $('#menu-toggle').on('click', function () {
    let open = $(this).attr('aria-expanded') !== 'true';
    $(this).attr('aria-expanded', open);
    $('#main-nav').toggleClass('is-open', open);
  });
  $('#main-nav a').on('click', function () {
    $('#menu-toggle').attr('aria-expanded', false);
    $('#main-nav').removeClass('is-open');
  });
  $('#back-to-top').prop('hidden', window.scrollY < 500);
  $(window).on('scroll', function () { $('#back-to-top').prop('hidden', window.scrollY < 500); });
  $('#back-to-top').on('click', function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
}

function showLoadError() {
  let message = t('js.dataError');
  if (message === 'js.dataError') message = 'Please start the local server and refresh the page.';
  $('#property-grid, #featured-grid, #saved-grid').html('<p class="load-error" role="alert">' + escapeHtml(message) + '</p>');
}

function startWebsite() {
  $.getJSON('translations.json', function (result) {
    words = result;
    $.getJSON('properties.json', function (result) {
      properties = result;
      let ids = properties.map(function (property) { return property.id; });
      favorites = favorites.filter(function (id) { return ids.includes(id); });
      comparison = comparison.filter(function (id) { return ids.includes(id); }).slice(0, 3);
      translatePage();
      setupGeneralEvents();
      setupPropertyEvents();
      setupFormEvents();
      renderProperties();
      updatePayment();
    }).fail(showLoadError);
  }).fail(showLoadError);
}

$(startWebsite);

let propertyDialog;
let comparisonDialog;
let currentProperty;
let currentImage = 0;
let previousFocus;

function propertyText(key, values) {
  return escapeHtml(t(key, values));
}

function propertyName(value) {
  return escapeHtml(localText(value));
}

function findProperty(id) {
  for (let property of properties) {
    if (property.id === id) return property;
  }
}

function propertySpecs(property) {
  return `<span>${propertyText('js.rooms', { count: property.rooms })}</span>
    <span>${formatNumber(property.area)} ${propertyText('js.squareMeters')}</span>
    <span>${propertyText('js.floor', { floor: property.floor, total: property.floors })}</span>`;
}

function pricePerMeter(property) {
  return propertyText('js.pricePerMeter', { price: formatPrice(property.price / property.area) });
}

function sourceLabel(property) {
  let date = property.sourceChecked.split('-').reverse().join('.');
  return propertyText('js.listingSnapshot', { id: property.listingId, date: date });
}

function propertyCard(property, allowCompare) {
  let saved = favorites.includes(property.id);
  let selected = comparison.includes(property.id);
  let compareControl = '';
  if (allowCompare) {
    compareControl = `<label class="compare-label"><input type="checkbox" data-action="compare"
      data-property-id="${property.id}" ${selected ? 'checked' : ''}> ${propertyText('js.compareThis')}</label>`;
  }
  return `<div class="col-sm-6 col-xl-4"><article class="property-card">
    <div class="property-image-wrap">
      <button class="property-image-link" data-action="details" data-property-id="${property.id}"
        aria-label="${propertyText('js.detailsFor', { title: localText(property.title) })}">
        <img class="property-image" src="${property.coverImage}" loading="lazy" width="800" height="600"
          alt="${propertyName(property.title)} · ${propertyText('js.complexImage')}">
      </button>
      <span class="property-tag">${propertyText('js.type.apartment')}</span>
      <button class="favorite-button ${saved ? 'is-saved' : ''}" data-action="favorite"
        data-property-id="${property.id}" aria-pressed="${saved}"
        aria-label="${propertyText(saved ? 'js.unsave' : 'js.save', { title: localText(property.title) })}">
        <span aria-hidden="true">${saved ? '♥' : '♡'}</span>
      </button>
    </div>
    <div class="property-content">
      <p class="property-location">${propertyText('js.city.Astana')} · ${propertyName(property.district)}</p>
      <h3 class="property-title"><button data-action="details" data-property-id="${property.id}">${propertyName(property.title)}</button></h3>
      <p class="property-address">${propertyName(property.address)}</p>
      <div class="property-specs">${propertySpecs(property)}</div>
      <div class="property-bottom"><strong class="property-price">${formatPrice(property.price)}</strong>
        <button class="property-open" data-action="details" data-property-id="${property.id}"
          aria-label="${propertyText('js.detailsFor', { title: localText(property.title) })}">${propertyText('js.view')} ↗</button>
      </div>
      <p class="property-unit-price">${pricePerMeter(property)}</p>
      <p class="property-source">${sourceLabel(property)}</p>${compareControl}
    </div>
  </article></div>`;
}

function fillPropertyGrid(id, list, allowCompare) {
  let html = '';
  for (let property of list) html += propertyCard(property, allowCompare);
  $('#' + id).html(html);
}

function filterProperties(animate) {
  if (!$('#property-grid').length) return;
  let query = ($('#search-input').val() || '').trim().toLowerCase();
  let district = $('#district-filter').val() || 'all';
  let price = $('#price-filter').val() || 'all';
  let rooms = $('#rooms-filter').val() || 'all';
  let sort = $('#sort-select').val() || 'featured';
  let results = properties.filter(function (property) {
    let searchText = [localText(property.title), localText(property.district), localText(property.address), 'Astana', t('js.city.Astana')].join(' ').toLowerCase();
    return searchText.includes(query) && (district === 'all' || property.districtCode === district)
      && (price === 'all' || property.price <= Number(price)) && (rooms === 'all' || property.rooms >= Number(rooms));
  });
  if (sort === 'price-asc') results.sort(function (a, b) { return a.price - b.price; });
  else if (sort === 'price-desc') results.sort(function (a, b) { return b.price - a.price; });
  else if (sort === 'area-desc') results.sort(function (a, b) { return b.area - a.area; });
  else results.sort(function (a, b) { return Number(b.featured) - Number(a.featured); });
  fillPropertyGrid('property-grid', results, true);
  $('#results-count').text(t('js.results', { count: results.length, total: properties.length }));
  $('#empty-state').prop('hidden', results.length > 0);
  if (animate && !reducedMotion) $('#property-grid').stop(true, true).hide().fadeIn(180);
}

function renderProperties() {
  let featured = properties.filter(function (property) { return property.featured; });
  let saved = properties.filter(function (property) { return favorites.includes(property.id); });
  let districts = [];
  for (let property of properties) {
    if (!districts.includes(property.districtCode)) districts.push(property.districtCode);
  }
  fillPropertyGrid('featured-grid', featured.slice(0, 3), false);
  fillPropertyGrid('saved-grid', saved, true);
  filterProperties(false);
  $('#saved-empty').prop('hidden', saved.length > 0);
  $('#clear-saved').prop('disabled', saved.length === 0);
  $('[data-saved-count]').text(favorites.length);
  $('#stat-properties').text(formatNumber(properties.length));
  $('#stat-districts').text(formatNumber(districts.length));
  $('#collection-range').text('01 — ' + String(properties.length).padStart(2, '0'));
  updateComparison();
}

function toggleFavorite(id) {
  let index = favorites.indexOf(id);
  if (index === -1) favorites.push(id);
  else favorites.splice(index, 1);
  saveStorage('qonys-favorites', favorites);
  renderProperties();
  showToast(t(index === -1 ? 'js.favoriteAdded' : 'js.favoriteRemoved'));
}

function updateComparison() {
  $('#comparison-bar').prop('hidden', comparison.length === 0);
  $('#compare-count').text(t('js.compareCount', { count: comparison.length }));
  $('#compare-open').prop('disabled', comparison.length < 2);
  $('[data-action="compare"]').each(function () {
    this.checked = comparison.includes(this.dataset.propertyId);
  });
}

function toggleComparison(id) {
  let index = comparison.indexOf(id);
  if (index !== -1) comparison.splice(index, 1);
  else if (comparison.length < 3) comparison.push(id);
  else showToast(t('js.compareLimit'));
  saveStorage('qonys-compare', comparison);
  updateComparison();
}

function makeDialog(id, titleId) {
  let dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'custom-dialog';
  dialog.setAttribute('aria-labelledby', titleId);
  document.body.appendChild(dialog);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', function () {
    document.body.classList.remove('dialog-is-open');
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  });
  return dialog;
}

function showDialog(dialog) {
  previousFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add('dialog-is-open');
  $(dialog).find('[data-close-dialog]').trigger('focus');
}

function openProperty(id) {
  currentProperty = findProperty(id);
  currentImage = 0;
  if (!propertyDialog) propertyDialog = makeDialog('property-dialog', 'detail-title');
  renderPropertyDialog();
  showDialog(propertyDialog);
}

function renderPropertyDialog() {
  let property = currentProperty;
  let features = '';
  for (let feature of property.features) features += '<li>' + propertyText('feature.' + feature) + '</li>';
  let condition = '';
  if (property.condition) condition = '<p class="listing-condition">' + propertyName(property.condition) + '</p>';
  propertyDialog.innerHTML = `<button class="dialog-close" data-close-dialog aria-label="${propertyText('js.close')}">×</button>
    <div class="dialog-body"><div class="detail-layout">
      <div class="detail-gallery"><img class="detail-image" width="800" height="600">
        <div class="gallery-controls"><button class="btn btn-outline-primary" data-gallery="previous" aria-label="${propertyText('js.previousImage')}">←</button>
          <span id="gallery-status" aria-live="polite"></span>
          <button class="btn btn-outline-primary" data-gallery="next" aria-label="${propertyText('js.nextImage')}">→</button></div>
        <p class="gallery-kind" id="gallery-kind" aria-live="polite"></p><p class="small muted">${propertyText('js.photoNotice')}</p>
      </div>
      <div class="detail-copy"><p class="eyebrow">${propertyText('js.city.Astana')} · ${propertyName(property.district)}</p>
        <h2 id="detail-title">${propertyName(property.title)}</h2><p class="detail-price">${formatPrice(property.price)}</p>
        <p class="property-unit-price">${pricePerMeter(property)}</p><p class="property-source">${sourceLabel(property)}</p>
        <p class="detail-address">${propertyName(property.address)}</p><p>${propertyName(property.description)}</p>
        <div class="property-specs">${propertySpecs(property)}</div>${condition}<ul class="detail-features">${features}</ul>
        <p><a class="text-link listing-source" href="${escapeHtml(property.sourceUrl)}" target="_blank" rel="noopener noreferrer">${propertyText('js.originalListing')} <span aria-hidden="true">↗</span></a></p>
        <a class="btn btn-primary" href="#viewing-form">${propertyText('js.requestViewing')}</a>
      </div>
    </div><hr><form class="viewing-form" id="viewing-form" novalidate>
      <h3>${propertyText('js.requestViewing')}</h3><p class="small muted">${propertyText('js.viewingNotice')}</p>
      <div class="row g-3">
        <div class="col-md-4"><label class="form-label" for="view-name">${propertyText('js.yourName')}</label>
          <input class="form-control" id="view-name" name="name" autocomplete="name" required maxlength="80" aria-describedby="view-name-error">
          <span class="field-error" data-view-error="name" id="view-name-error" aria-live="polite"></span></div>
        <div class="col-md-4"><label class="form-label" for="view-email">${propertyText('js.email')}</label>
          <input class="form-control" id="view-email" name="email" type="email" autocomplete="email" required maxlength="120" aria-describedby="view-email-error">
          <span class="field-error" data-view-error="email" id="view-email-error" aria-live="polite"></span></div>
        <div class="col-md-4"><label class="form-label" for="view-date">${propertyText('js.preferredDate')}</label>
          <input class="form-control" id="view-date" name="date" type="date" min="${today()}" required aria-describedby="view-date-error">
          <span class="field-error" data-view-error="date" id="view-date-error" aria-live="polite"></span></div>
      </div><button class="btn btn-primary mt-3" type="submit">${propertyText('js.saveViewing')}</button>
      <p class="viewing-success" role="status" hidden></p>
    </form></div>`;
  showGalleryImage();
}

function showGalleryImage() {
  let property = currentProperty;
  let kind = t('js.imageKind.' + property.imageKinds[currentImage]);
  $('#property-dialog .detail-image').attr('src', property.images[currentImage]).attr('alt', localText(property.title) + ' · ' + kind);
  $('#gallery-status').text(t('js.imageCount', { current: currentImage + 1, total: property.images.length }));
  $('#gallery-kind').text(kind);
  $('[data-gallery]').prop('disabled', property.images.length < 2);
}

function validateViewing() {
  let form = document.getElementById('viewing-form');
  let nameLength = form.elements.name.value.trim().length;
  let errors = {
    name: nameLength < 2 || nameLength > 80 ? t('js.nameError') : '',
    email: form.elements.email.validity.valid && form.elements.email.value.trim() ? '' : t('js.emailError'),
    date: form.elements.date.validity.valid && form.elements.date.value >= today() ? '' : t('js.dateError')
  };
  let valid = true;
  for (let name in errors) {
    let hasError = errors[name] !== '';
    $(form.elements[name]).toggleClass('is-invalid', hasError).attr('aria-invalid', String(hasError));
    $('[data-view-error="' + name + '"]').text(errors[name]);
    if (hasError) valid = false;
  }
  return valid;
}

function comparisonValue(property, field) {
  if (field === 'price') return formatPrice(property.price);
  if (field === 'meter') return pricePerMeter(property);
  if (field === 'floor') return propertyText('js.floor', { floor: property.floor, total: property.floors });
  if (field === 'area') return formatNumber(property.area) + ' ' + propertyText('js.squareMeters');
  if (field === 'features') {
    let features = [];
    for (let feature of property.features) features.push(t('feature.' + feature));
    return escapeHtml(features.join(', ') || '—');
  }
  return property[field] ? propertyName(property[field]) : '—';
}

function renderComparison() {
  let selected = properties.filter(function (property) { return comparison.includes(property.id); });
  let columns = '';
  for (let property of selected) columns += `<th scope="col"><img src="${property.coverImage}" alt="" width="240" height="160"><span>${propertyName(property.title)}</span></th>`;
  let rows = [['js.price', 'price'], ['js.pricePerMeterLabel', 'meter'], ['js.district', 'district'], ['js.roomsLabel', 'rooms'],
  ['js.floorLabel', 'floor'], ['js.area', 'area'], ['js.condition', 'condition'], ['js.features', 'features']];
  let body = '';
  for (let row of rows) {
    body += '<tr><th scope="row">' + propertyText(row[0]) + '</th>';
    for (let property of selected) body += '<td>' + comparisonValue(property, row[1]) + '</td>';
    body += '</tr>';
  }
  comparisonDialog.innerHTML = `<button class="dialog-close" data-close-dialog aria-label="${propertyText('js.close')}">×</button>
    <div class="dialog-body"><p class="eyebrow">${propertyText('js.sideBySide')}</p><h2 id="compare-title">${propertyText('js.compareHomes')}</h2>
      <p>${propertyText('js.compareDescription')}</p><div class="table-responsive"><table class="compare-table table">
        <caption class="visually-hidden">${propertyText('js.compareHomes')}</caption>
        <thead><tr><th scope="col">${propertyText('js.property')}</th>${columns}</tr></thead><tbody>${body}</tbody>
      </table></div></div>`;
}

function refreshOpenDialog() {
  if (propertyDialog && propertyDialog.open) renderPropertyDialog();
  if (comparisonDialog && comparisonDialog.open) renderComparison();
}

function setupPropertyEvents() {
  let params = new URLSearchParams(location.search);
  let fields = { q: 'search-input', district: 'district-filter', price: 'price-filter', rooms: 'rooms-filter', sort: 'sort-select' };
  for (let key in fields) {
    if (params.has(key)) $('#' + fields[key]).val(params.get(key));
  }
  renderProperties();
  $('#filter-form').on('submit', function (event) { event.preventDefault(); });
  $('#filter-form').on('input change', function () { filterProperties(true); });
  $('#reset-filters').on('click', function () {
    document.getElementById('filter-form').reset();
    filterProperties(true);
  });
  $(document).on('click', '[data-action="details"]', function () { openProperty(this.dataset.propertyId); });
  $(document).on('click', '[data-action="favorite"]', function () { toggleFavorite(this.dataset.propertyId); });
  $(document).on('change', '[data-action="compare"]', function () { toggleComparison(this.dataset.propertyId); });
  $('#clear-saved').on('click', function () {
    favorites = [];
    saveStorage('qonys-favorites', favorites);
    renderProperties();
    showToast(t('js.savedCleared'));
  });
  $('#compare-clear').on('click', function () {
    comparison = [];
    saveStorage('qonys-compare', comparison);
    updateComparison();
  });
  $('#compare-open').on('click', function () {
    if (comparison.length < 2) return;
    if (!comparisonDialog) comparisonDialog = makeDialog('compare-dialog', 'compare-title');
    renderComparison();
    showDialog(comparisonDialog);
  });
  $(document).on('click', '[data-close-dialog]', function () { $(this).closest('dialog')[0].close(); });
  $(document).on('click', '[data-gallery]', function () {
    let change = this.dataset.gallery === 'next' ? 1 : -1;
    currentImage = (currentImage + change + currentProperty.images.length) % currentProperty.images.length;
    showGalleryImage();
  });
  $(document).on('click', 'a[href="#viewing-form"]', function (event) {
    event.preventDefault();
    document.getElementById('view-name').focus();
    document.getElementById('viewing-form').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  $(document).on('input', '#viewing-form input', function () {
    $('.viewing-success').prop('hidden', true);
    if ($(this).hasClass('is-invalid')) validateViewing();
  });
  $(document).on('submit', '#viewing-form', function (event) {
    event.preventDefault();
    $('.viewing-success').prop('hidden', true);
    if (!validateViewing()) {
      $(this).find('.is-invalid').first().trigger('focus');
      return;
    }
    let requests = readStorage('qonys-viewings', []);
    requests.push({ propertyId: currentProperty.id, name: this.elements.name.value.trim(), email: this.elements.email.value.trim(), date: this.elements.date.value });
    if (!saveStorage('qonys-viewings', requests.slice(-50))) return;
    this.reset();
    $('.viewing-success').text(t('js.viewingSaved')).prop('hidden', false);
    showToast(t('js.viewingSaved'));
  });
}

let contactFields = ['name', 'email', 'phone', 'message', 'consent'];

function checkContactField(form, name) {
  let field = form.elements[name];
  let value = field.value.trim();
  let message = '';
  if (name === 'name' && (value.length < 2 || value.length > 80)) {
    message = t('js.nameError');
  }
  if (name === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 120)) {
    message = t('js.emailError');
  }
  if (name === 'phone' && value !== '' && (!/^[+\d\s()\-]{7,24}$/.test(value) || value.replace(/\D/g, '').length < 7)) {
    message = t('js.phoneError');
  }
  if (name === 'message' && (value.length < 10 || value.length > 1000)) {
    message = t('js.messageError');
  }
  if (name === 'consent' && !field.checked) {
    message = t('js.consentError');
  }
  let error = $(form).find('[data-error-for="' + name + '"]');
  $(field).toggleClass('is-invalid', message !== '');
  $(field).attr('aria-invalid', String(message !== ''));
  $(field).attr('aria-describedby', error.attr('id'));
  error.text(message);
  return message === '';
}

function setupFormEvents() {
  let form = document.getElementById('contact-form');
  if (form) {
    $(form).on('blur', 'input, textarea', function () {
      if (contactFields.indexOf(this.name) !== -1) {
        checkContactField(form, this.name);
      }
    });
    $(form).on('input change', 'input, textarea, select', function () {
      if ($(this).hasClass('is-invalid')) {
        checkContactField(form, this.name);
      }
      $('#contact-success').prop('hidden', true);
    });
    $(form).on('submit', function (event) {
      event.preventDefault();
      $('#contact-success').prop('hidden', true);
      let valid = true;
      for (let i = 0; i < contactFields.length; i++) {
        if (!checkContactField(form, contactFields[i])) {
          valid = false;
        }
      }
      if (!valid) {
        $(form).find('.is-invalid').first().trigger('focus');
        return;
      }
      let messages = readStorage('qonys-messages', []);
      if (!Array.isArray(messages)) messages = [];
      messages.push({
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        interest: form.elements.interest.value,
        message: form.elements.message.value.trim(),
        createdAt: new Date().toISOString()
      });
      if (!saveStorage('qonys-messages', messages.slice(-50))) {
        showToast(t('js.storageUnavailable'));
        return;
      }
      form.reset();
      $('#contact-success').text(t('js.messageSaved')).prop('hidden', false);
      showToast(t('js.messageSaved'));
    });
  }
  $('#copy-email').on('click', function () {
    let email = $(this).attr('data-copy');
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showToast(t('js.copyError', { email: email }));
      return;
    }
    navigator.clipboard.writeText(email).then(function () {
      showToast(t('js.emailCopied'));
    }, function () {
      showToast(t('js.copyError', { email: email }));
    });
  });
  $('#payment-form').on('input', updatePayment);
  $('#payment-form').on('submit', function (event) {
    event.preventDefault();
    updatePayment();
  });
}

function updatePayment() {
  if (!document.getElementById('payment-form')) return;
  let price = Number($('#calc-price').val());
  let deposit = Number($('#calc-deposit').val());
  let rate = Number($('#calc-rate').val());
  let years = Number($('#calc-years').val());
  let ids = ['calc-price', 'calc-deposit', 'calc-rate', 'calc-years'];
  let errors = [
    !Number.isFinite(price) || price <= 0 || price > 10000000000,
    !Number.isFinite(deposit) || deposit < 0 || deposit > 99,
    !Number.isFinite(rate) || rate < 0 || rate > 50,
    !Number.isInteger(years) || years < 1 || years > 40
  ];
  for (let i = 0; i < ids.length; i++) {
    if ($('#' + ids[i]).val() === '') errors[i] = true;
    $('#' + ids[i]).toggleClass('is-invalid', errors[i]);
    $('#' + ids[i]).attr('aria-invalid', String(errors[i]));
    $('#' + ids[i]).attr('aria-describedby', 'calc-error');
  }
  let monthly = 0;
  let principal = price * (1 - deposit / 100);
  let monthlyRate = rate / 100 / 12;
  let months = years * 12;
  if (monthlyRate === 0) {
    monthly = principal / months;
  } else {
    let growth = Math.pow(1 + monthlyRate, months);
    monthly = principal * monthlyRate * growth / (growth - 1);
  }
  if (errors.indexOf(true) !== -1 || !Number.isFinite(monthly)) {
    $('#calc-error').text(t('js.calculatorError'));
    $('#calc-result').text('—');
    $('#calc-summary').text('');
    return;
  }
  $('#calc-error').text('');
  $('#calc-result').text(formatPrice(monthly));
  $('#calc-summary').text(t('js.calculatorSummary', {
    deposit: formatPrice(price * deposit / 100),
    principal: formatPrice(principal),
    years: years
  }));
}

function updateFormLanguage() {
  let form = document.getElementById('contact-form');
  if (form) {
    for (let i = 0; i < contactFields.length; i++) {
      if ($(form.elements[contactFields[i]]).hasClass('is-invalid')) {
        checkContactField(form, contactFields[i]);
      }
    }
    if (!$('#contact-success').prop('hidden')) {
      $('#contact-success').text(t('js.messageSaved'));
    }
  }
  updatePayment();
}
