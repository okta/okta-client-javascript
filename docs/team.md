---
layout: page
---
<script setup>
  import {
    VPTeamMembers
  } from 'vitepress/theme'

  const members = [
    {
      avatar: 'https://github.com/jaredperreault-okta.png',
      name: 'Jared Perreault',
      title: 'Author',
      desc: 'Jared is the Lead JavaScript SDK Engineer at Okta. He loves JavaScript, developing SDKs and absolutely loathes TypeScript',
      links: [
        { icon: 'github', link: 'https://github.com/jaredperreault-okta' },
        { icon: 'linkedin', link: 'https://www.linkedin.com/in/jaredperreault' }
      ]
    }
  ]
  </script>

<VPTeamMembers :members />