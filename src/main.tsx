import type {FormEvent} from 'react';
import {StrictMode, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
    ArrowUpRight,
    BarChart3,
    CircleCheck,
    Eye,
    Globe2,
    Image,
    Link,
    LoaderCircle,
    MoveRight,
    ScanLine,
    ShieldCheck,
    Type,
    X,
    Zap
} from 'lucide-react';
import type {Progress, Report} from './api';
import {sampleReport, scanSite} from './api';
import ReportView from './ReportView';
import './app.css';
import './scan.css';
import './mobile.css';

function Decorations() {
    return <div className="decorations" aria-hidden="true">{[Image, Type, Eye, ShieldCheck].map((Icon, i) => <div
        className={`floating-icon float-${i}`} key={i}><Icon/></div>)}{Array.from({length: 7}, (_, i) => <span
        className={`star star-${i}`} key={i}>{i % 3 === 0 ? '✦' : '+'}</span>)}</div>
}

function App() {
    const [screen, setScreen] = useState<'home' | 'scanning' | 'results'>('home');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [allPages, setAllPages] = useState(true);
    const maxPages = allPages ? null : 1;
    const maxDepth = allPages ? null : 0;
    const [report, setReport] = useState<Report | null>(null);
    const latestReport = useRef<Report | null>(null);
    const [progress, setProgress] = useState<Progress>({type: 'progress'});
    const [scanned, setScanned] = useState<string[]>([]);
    const request = useRef<AbortController | null>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const main = useRef<HTMLElement>(null);
    useEffect(() => {
        const onHash = () => {
            if (location.hash === '#main') return;
            if (request.current) return;
            setScreen(location.hash === '#results' && latestReport.current ? 'results' : 'home');
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash)
    }, []);
    useEffect(() => () => request.current?.abort(), []);
    useEffect(() => {
        if (screen === 'results') {
            window.scrollTo(0, 0);
            main.current?.focus({preventScroll: true})
        }
    }, [screen]);

    async function start(e?: FormEvent) {
        e?.preventDefault();
        if (request.current) return;
        let normalized;
        try {
            const parsed = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
            if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw Error();
            normalized = parsed.href;
        } catch {
            setError('올바른 웹사이트 주소를 입력해주세요. 예: https://example.com');
            return;
        }
        const controller = new AbortController();
        request.current = controller;
        setUrl(normalized);
        setError('');
        setProgress({type: 'progress', message: '검사 서버에 연결하고 있습니다.', completed: 0, limit: maxPages});
        setScanned([]);
        setScreen('scanning');
        window.scrollTo(0, 0);
        try {
            const result = await scanSite(normalized, maxPages, maxDepth, controller.signal, event => {
                if (request.current !== controller) return;
                if (event.type === 'page' && event.page) {
                    setScanned(previous => [...previous.slice(-2), event.page!.name]);
                    setProgress(previous => ({...previous, completed: event.completed, message: '페이지 검사가 완료되었습니다.'}));
                } else if (event.type === 'progress') setProgress(event);
            });
            if (controller.signal.aborted || request.current !== controller) return;
            showReport(result);
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(err instanceof Error ? err.message : '검사를 완료하지 못했습니다.');
                setScreen('home');
                history.replaceState(null, '', location.pathname);
            }
        } finally {
            if (request.current === controller) request.current = null;
        }
    }

    function cancel() {
        request.current?.abort();
        request.current = null;
        setScreen('home');
        setError('검사를 취소했습니다.');
        history.replaceState(null, '', location.pathname);
    }

    function showReport(result: Report) {
        // hashchange can run before React commits the new report state.
        latestReport.current = result;
        setReport(result);
        setScreen('results');
        location.hash = 'results';
    }

    function sample() {
        showReport(sampleReport());
        setUrl('https://example.com/');
        setError('');
    }

    return <><a className="skip-link" href="#main">본문 바로가기</a>
        <header><a className="brand" href="#" onClick={e => {
            if (screen === 'scanning') {
                e.preventDefault();
                cancel();
            }
        }} aria-label="행복ICT 홈"><img className="brand-logo" src="/happy-ict-logo.png" alt="행복ICT" width="116" height="43"/></a>
            <button className="login" onClick={() => dialog.current?.showModal()}>로그인</button>
        </header>
        <main ref={main} tabIndex={-1} id="main" className={screen === 'results' ? 'results-main' : 'landing-main'}>
            {screen === 'results' && report ?
                <ReportView key={report.finishedAt} report={report} url={url} setUrl={setUrl} onStart={start}
                            error={error}/> : <div className="hero">
                    <section className="hero-copy entrance"><span className="eyebrow"><span/>모두를 위한 더 나은 웹</span>
                        <h1>웹접근성<br/>자동 점검 솔루션<span className="title-dot">.</span></h1><p className="intro">URL 하나로
                            서브페이지까지 자동으로 수집하고,<br className="desktop-break"/>33개 웹접근성 항목의 검사 결과와 근거를 확인하세요.</p>
                        <div className="features">{[{
                            icon: CircleCheck,
                            title: '33개 항목 점검',
                            desc: <>자동 검사와 확인 단서로<br/>놓치기 쉬운 부분까지</>
                        }, {
                            icon: Zap,
                            title: '서브페이지 자동 수집',
                            desc: <>같은 사이트의 링크를 따라<br/>한 번에 여러 페이지 점검</>
                        }, {
                            icon: BarChart3,
                            title: '이해하기 쉬운 보고서',
                            desc: <>직관적인 요약과 상세 결과로<br/>
                                누구나 쉽게 확인</>
                        }].map(({icon: Icon, title, desc}) => <div className="feature" key={title}><span
                            className="feature-icon"><Icon/></span>
                            <div><strong>{title}</strong><p>{desc}</p></div>
                        </div>)}</div>
                    </section>
                    <section className="checker-scene entrance"><Decorations/>
                        <div className="browser-card">
                            <div className="browser-bar"><i/><i/><i/><span>ACCESSIBILITY CHECK</span><ShieldCheck
                                size={15}/></div>
                            <div className="checker-body">{screen === 'scanning' ? <div className="scan-view">
                                <div className="scanner"><Globe2 size={54}/><span className="scan-line"/></div>
                                <span className="eyebrow">실제 웹사이트 검사 중</span><h2>페이지 하나하나<br/>꼼꼼하게 살펴보고 있어요</h2><p
                                aria-live="polite">{progress.message}</p>
                                <div className="progress-track indeterminate" aria-label="웹사이트 검사 진행 중"
                                     role="progressbar"><span/></div>
                                <div className="progress-label"><span><LoaderCircle className="spin"
                                                                                    size={14}/>{progress.completed || 0}페이지 검사 완료</span><strong>{maxPages === null ? '페이지 제한 없음' : `최대 ${maxPages}페이지`}</strong>
                                </div>
                                {progress.currentUrl && <p className="current-url">{progress.currentUrl}</p>}
                                <ul className="scanned-pages">{scanned.slice(-3).map((name, i) => <li key={i}>
                                    <CircleCheck size={13}/>{name}</li>)}</ul>
                                <button className="text-button" onClick={cancel}>검사 취소</button>
                            </div> : <>
                                <div className="globe-icon"><Globe2 size={28}/><span/></div>
                                <h2>웹사이트 주소를 입력하고<br/>접근성을 점검해보세요!</h2><p>서브페이지를 자동으로 수집하여<br/>33개 항목을 네 단계로 분류합니다.</p>
                                <form onSubmit={start} noValidate><label
                                    className={`url-field ${error ? 'invalid' : ''}`}><Link size={20}/><input
                                    aria-label="분석할 웹사이트 주소" aria-describedby={error ? 'url-error' : undefined}
                                    aria-invalid={!!error} value={url} onChange={e => {
                                    setUrl(e.target.value);
                                    setError('')
                                }} placeholder="https://example.com" autoComplete="url"/></label>
                                    <div className="crawl-options">
                                        <label><input type="checkbox" checked={allPages}
                                            onChange={e => setAllPages(e.target.checked)}
                                            aria-describedby="crawl-scope-help"/>전체 페이지 검수</label>
                                        <p id="crawl-scope-help">{allPages ? '같은 사이트의 연결된 페이지를 모두 검수합니다.' : '입력한 페이지만 검수합니다.'}</p>
                                    </div>
                                    {error && <p className="field-error" id="url-error" role="alert">{error}</p>}
                                    <button className="primary" type="submit"><ScanLine size={18}/>검사 시작<MoveRight
                                        size={19}/></button>
                                </form>
                                <button className="sample-link" onClick={sample}>샘플 결과 먼저 살펴보기<ArrowUpRight size={14}/>
                                </button>
                                <div className="demo-note">자동 확정이 어려운 항목은 수동 확인 사유를 표시합니다.</div>
                            </>}</div>
                        </div>
                    </section>
                </div>}
        </main>
        <footer>Web Accessibility Auto Checker <span>v1.0</span><span className="footer-dot">·</span>행복ICT</footer>
        <dialog ref={dialog} className="info-dialog" aria-labelledby="login-title">
            <button className="dialog-close" aria-label="닫기" onClick={() => dialog.current?.close()}><X/></button>
            <ShieldCheck className="dialog-icon" size={36}/><h2 id="login-title">로그인 기능은 준비 중입니다</h2><p>로그인 없이 공개 웹사이트를
            검사할 수 있습니다.</p>
            <button className="primary" onClick={() => dialog.current?.close()}>확인</button>
        </dialog>
    </>;
}

createRoot(document.getElementById('app')!).render(<StrictMode><App/></StrictMode>);
