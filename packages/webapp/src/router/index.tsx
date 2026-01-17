import type { FC } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { clearAuthState, getAuthState, useRouter } from '@/utils'

import type { CustomRouteConfig } from './config'
import config from './config'
import { AuthService } from '@/service'

/*!
 * route-order https://github.com/sfrdmn/node-route-order
 *
 * Takes a sliced path and returns an integer representing the
 * "weight" of its free variables. More specific routes are heavier
 *
 * Intuitively: when a free variable is at the base of a path e.g.
 * '/:resource', this is more generic than '/resourceName/:id' and thus has
 * a lower weight
 *
 * Weight can only be used to compare paths of the same depth
 */
function pathWeight(sliced: string[]): number {
	return sliced.reduce(function(weight, part, i) {
		// If is bound part
		if (!/^:.+$/.test(part)) {
			// Weight is positively correlated to indexes of bound parts
			weight += Math.pow(i + 1, sliced.length)
		}
		return weight
	}, 0)
}

const AutoLogin: FC<{}> = () => {

	const router = useRouter()

	useEffect(() => {
		async function attemptIframeLogin(event: any) {
			console.log("Attempt login ", event)
			const allowedOrigins = ["https://demo.comhairle.scot", "https://community.comhairle.scot", "https://stage.comhairle.scot", "https://comhairle.scot", "https://la.comhairle.scot", "https://www.rewritela.org/"]
			console.log("origin ", event.origin)
			console.log("allowed ", !(allowedOrigins.includes(event.origin) || event.origin.startsWith("http://localhost")))
			console.log("included ", allowedOrigins.includes(event.origin))

			if (!(allowedOrigins.includes(event.origin) || event.origin.startsWith("http://localhost"))) return;

			const { type, user, password, redirect } = event.data;

			if (type === "HEYFORM_LOGIN" && user && password) {
				try {
					console.log("Trying the actual login")
					console.log("clearing auth state ")
					clearAuthState()
					await AuthService.login(user, password)
					console.log("trying redirect")
					router.redirect(redirect)
				} catch (err) {
					console.error("Login iframe failed:", err);
				}
			}
		}

		window.addEventListener("message", attemptIframeLogin)
		return () => window.removeEventListener("message", attemptIframeLogin)

	})
	return null
}

function sortRoute(pathA: string, pathB: string) {
	if (/^\/$/.test(pathA)) {
		return -1
	}

	if (/^\/$/.test(pathB)) {
		return 1
	}

	const slicedA = pathA.split('/')
	const slicedB = pathB.split('/')
	const depthA = slicedA.length
	const depthB = slicedB.length

	if (depthA === depthB) {
		const weightA = pathWeight(slicedA)
		const weightB = pathWeight(slicedB)
		return weightA > weightB ? 1 : -1
	} else {
		return depthA > depthB ? 1 : -1
	}
}

const CustomRoute: FC<CustomRouteConfig> = ({
	loginRequired = true,
	redirectIfLogged = true,
	layout: Layout,
	component: Component,
	title
}) => {
	const { t } = useTranslation()
	const isLoggedIn = getAuthState()

	const children = (
		<Layout>
			<AutoLogin />
			<Component />
		</Layout>
	)

	useEffect(() => {
		if (title) {
			document.title = `${t(title)} - ${t('app.name')}`
		}
	}, [title])

	if (loginRequired) {
		if (isLoggedIn) {
			return children
		} else {
			const redirectUri = window.location.pathname + window.location.search
			return <Navigate to={`/login?redirect_uri=${encodeURIComponent(redirectUri)}`} replace />
		}
	} else {
		return isLoggedIn && redirectIfLogged ? <Navigate to="/" replace /> : children
	}
}

export default () => {
	const routes = config.sort((i, j) => sortRoute(j.path, i.path))

	return (
		<BrowserRouter>
			<Routes>
				{routes.map(route => (
					<Route key={route.path} path={route.path} element={<CustomRoute {...route} />} />
				))}
				<Route path="*" element={<Navigate to="/" replace />}></Route>
			</Routes>
		</BrowserRouter>
	)
}
