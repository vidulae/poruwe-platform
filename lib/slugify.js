'use strict';

function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'couple';
}

function coupleSlug(groom, bride) {
  return slugify(`${groom}-and-${bride}`);
}

module.exports = { slugify, coupleSlug };
