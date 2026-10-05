import { httpRouter } from 'convex/server';

import { httpAction } from './_generated/server';
import { deleteAccountPage, privacyPolicyPage } from './legalPages';

const http = httpRouter();

function html(body: string) {
  return httpAction(async () => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
}

http.route({ path: '/privacy', method: 'GET', handler: html(privacyPolicyPage) });
http.route({ path: '/delete-account', method: 'GET', handler: html(deleteAccountPage) });

export default http;
