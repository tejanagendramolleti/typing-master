import { Link } from 'react-router-dom'
import { Cta } from '../components/ui'

/**
 * The page shown for a URL that does not exist.
 */
export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="text-display mt-3">That page is not here</h1>
      <p className="text-body mt-4 max-w-md">
        The link may be old, or the address may have a typo in it. The catalogue is
        the best place to pick up from.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Cta to="/exams">Browse the exams</Cta>
        <Link to="/" className="btn-secondary btn-lg">
          Go to the home page
        </Link>
      </div>
    </div>
  )
}
