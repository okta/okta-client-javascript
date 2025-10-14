
export function Embedded () {
  const DEMO_ONLY_isCrossDomain = (new URL(window.location.href).searchParams.get('xdomain') == "1");
  const iframeUrl = `http://${DEMO_ONLY_isCrossDomain ? 'app.' : ''}localhost:8080/messages`;

  return (
    <main>
      <div className='flex flex-1'>
        <div className='flex-1'>
          <iframe src={iframeUrl} data-e2e="iframe"></iframe>
        </div>
      </div>
    </main>
  );
}
