import { Component } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Credential } from '@okta/spa-platform';
import { signIn } from '@/auth';
import { Loading } from './Loading';

interface SecureRouteProps {
  loadingElement?: React.ReactElement;
  onRemovalPath?: string;
  withDefault?: boolean;
  withTag?: string;
  findCredential?: () => Promise<Credential | null>;
}

type SecureRouteState = {
  active: Credential | null;
  hasRemoved: boolean;
}

export class SecureRoute extends Component<SecureRouteProps, SecureRouteState> {
  state: SecureRouteState = {
    active: null,
    hasRemoved: false,
  };

  signIn: Promise<any> | null = null;

  static defaultProps = {
    loadingElement: (<Loading />),
    onRemovalPath: '/',
  };

  async verifyCredential () {
    const { active } = this.state;
    const {
      withTag,
      findCredential,
    } = this.props;
    let { withDefault = false } = this.props;

    // only default `withDefault` to true if no other conditions are passed
    if (!withTag && !findCredential) {
      withDefault = true;
    }

    const cred: Credential | null =
      active !== null ? await Credential.with(active.id) :
      findCredential ? await findCredential() :
      withTag ? (await Credential.find({ tags: withTag }))?.[0] :
      withDefault === true ? await Credential.getDefault() : null;

    // if no cred is found, trigger login
    const requestMeta: Record<string, any> | undefined =
      withDefault ? { isDefault: true } :
      withTag ? { tags: [withTag] } : undefined;

    if (cred) {
      try {
        await cred.refreshIfNeeded();

        // token was either valid initially or refreshed successfully
        this.setState({ active: cred });
        return;
      }
      catch {
        // token is expired and refresh threw error
        console.log('refresh failed');
        await cred.remove();
        this.setState({ active: null });
      }
    }
    else {
      this.setState({ active: null });
    }
    
    await signIn(window.location.href, requestMeta);
  }

  async componentDidMount(): Promise<void> {
    Credential.on('credential_refreshed', ({ credential }) => {
      const { active } = this.state;
      if (active && active.id === credential.id) {
        this.forceUpdate();
      }
    });

    Credential.on('credential_removed', ({ id }) => {
      if (this.state.active?.id === id) {
        this.setState({ hasRemoved: true });
      }
    });

    await this.verifyCredential();
  }

  componentWillUnmount(): void {
    Credential.off('credential_refreshed');
    Credential.off('credential_removed');
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

  async componentDidUpdate(prevProps: Readonly<SecureRouteProps>, prevState: Readonly<SecureRouteState>): Promise<void> {
    // console.log('props: ', prevProps, this.props);
    // console.log('state:' , prevState, this.state);
    if (prevState.active !== null && this.state.active === null) {
      await prevState.active?.remove();
    }
  }

  render () {
    const { loadingElement, onRemovalPath } = this.props;
    const { active, hasRemoved } = this.state;

    if (hasRemoved) {
      return (<Navigate to={onRemovalPath!} replace={true} />);
    }

    if (active) {
      // console.log('render credential: ', active)

      if (active && !active.token.isExpired) {
        return (<Outlet context={{ credential: active }} />);
      }
    }

    return loadingElement;
  }
}
