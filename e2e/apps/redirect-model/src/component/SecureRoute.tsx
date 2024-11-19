import { Component } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Credential, Events } from '@okta/spa-platform';
import { signIn } from '@/auth';
import { Loading } from './Loading';

interface SecureRouteProps {
  loadingElement?: React.ReactElement;
  onRemovalPath?: string;
  withDefault?: boolean;
  withTag?: string;
  findCredential?: () => Credential;
}

type SecureRouteState = {
  id: string | null;
  hasRemoved: boolean;
}

let verifiedCredential = false;

function findByTags (tags: string[]) {
  return Credential.find(meta => tags.every((scp) => meta.tags.includes(scp)));
}

export class SecureRoute extends Component<SecureRouteProps, SecureRouteState> {
  state = {
    id: null,
    hasRemoved: false,
  } as {
    id: string | null,
    hasRemoved: boolean
  };

  signIn: Promise<any> | null = null;

  static defaultProps = {
    loadingElement: (<Loading />),
    onRemovalPath: '/',
  };

  async verifyCredential () {
    if (verifiedCredential) {
      return;
    }

    const { id } = this.state;
    const {
      withTag,
      findCredential,
    } = this.props;
    let { withDefault = false } = this.props;

    const credential = id ? Credential.with(id) : null;

    // only default `withDefault` to true if no other conditions are passed
    if (!withTag && !findCredential) {
      withDefault = true;
    }

    withTag && console.log('findByTags: ', findByTags([withTag]));

    // TODO: review this!?!?
    const cred: Credential | null = credential ??
      (findCredential && findCredential()) as Credential ??
      (withTag && findByTags([withTag])[0]) as Credential ??
      (withDefault === true && Credential.default) as Credential ??
      null;

    // if no cred is found, trigger login
    const requestMeta: Record<string, any> | undefined =
      withDefault ? { isDefault: true } :
      withTag ? { tags: [withTag] } : undefined;

    console.log('credential found: ', cred, cred && cred.token.isExpired);

    if (cred) {
      try {
        await cred.refreshIfNeeded();

        // token was either valid initially or refreshed successfully
        this.setState({ id: cred.id });
        verifiedCredential = true;
        return;
      }
      catch {
        // token is expired and refresh threw error
        console.log('refresh failed');
        cred.remove();
        this.setState({ id: null });
      }
    }
    
    await signIn(window.location.href, requestMeta);
  }

  async componentDidMount(): Promise<void> {
    Credential.on(Events.CREDENTIAL_REFRESHED, ({ credential }) => {
      const { id } = this.state;
      if (id && id === credential.id) {
        this.forceUpdate();
      }
    });

    Credential.on(Events.CREDENTIAL_REMOVED, ({ id }) => {
      if (this.state.id === id) {
        this.setState({ hasRemoved: true });
      }
    });

    await this.verifyCredential();
  }

  componentWillUnmount(): void {
    Credential.off(Events.CREDENTIAL_REFRESHED);
    Credential.off(Events.CREDENTIAL_REMOVED);
  }

  // ensures child component will only be rendered once
  // (some of this seems to be done when using functional component with useEffect)
  // shouldComponentUpdate(nextProps: Readonly<SecureRouteProps>, nextState: Readonly<SecureRouteState>): boolean {
  //   if (this.state.hasRemoved !== nextState.hasRemoved) {
  //     return true;
  //   }

  //   if (this.state.id !== nextState.id) {
  //     return true;
  //   }

  //   return false;
  // }

  componentDidUpdate(prevProps: Readonly<SecureRouteProps>, prevState: Readonly<SecureRouteState>): void {
    // console.log('props: ', prevProps, this.props);
    // console.log('state:' , prevState, this.state);
    if (prevState.id !== null && this.state.id === null) {
      const credential = Credential.with(prevState.id);
      credential?.remove();
    }
  }

  render () {
    console.log('SecureRoute rendered', this.state);
    const { loadingElement, onRemovalPath } = this.props;
    const { id, hasRemoved } = this.state;

    if (hasRemoved) {
      return (<Navigate to={onRemovalPath!} replace={true} />);
    }

    if (id) {
      const credential = Credential.with(id);
      console.log('render credential: ', credential)

      if (credential && !credential.token.isExpired) {
        return (<Outlet context={{ credential }} />);
      }
    }

    return loadingElement;
  }
}
