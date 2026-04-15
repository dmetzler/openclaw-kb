---
title: Kubernetes Networking Deep Dive
source: manual
date: '2026-04-15T08:18:20.819Z'
tags: []
---


# Kubernetes Networking Deep Dive

Kubernetes networking is built around a flat network model where every Pod gets
its own IP address. This eliminates the need for NAT between containers and
simplifies service discovery.

## Container Network Interface (CNI)

The Container Network Interface (CNI) is the standard plugin API that Kubernetes
uses to configure network interfaces in Linux containers. Popular CNI plugins
include Calico, Cilium, and Flannel. Calico provides layer-3 networking using
BGP, while Cilium leverages eBPF for high-performance data plane operations.

## Services and kube-proxy

A Kubernetes Service provides a stable virtual IP (ClusterIP) that load-balances
traffic across a set of Pods selected by label selectors. kube-proxy, running on
every node, implements this abstraction using iptables or IPVS rules.

## Network Policies

Network Policies act as a firewall for Pod-to-Pod communication. They are
implemented by the CNI plugin (not kube-proxy) and use label selectors to define
ingress and egress rules. Without any NetworkPolicy, all Pods can communicate
freely — this is the default "allow all" posture.

## DNS in Kubernetes

CoreDNS is the default cluster DNS provider. It resolves Service names to
ClusterIPs, enabling Pods to reach services by name (e.g.
my-svc.my-namespace.svc.cluster.local). CoreDNS supports plugins for caching,
forwarding, and custom record injection.

## Ingress and Gateway API

Ingress resources define HTTP/HTTPS routing rules from external traffic into
cluster Services. The newer Gateway API provides a more expressive, role-oriented
model that separates infrastructure concerns (GatewayClass, Gateway) from
application routing (HTTPRoute). Popular ingress controllers include NGINX
Ingress Controller, Traefik, and Envoy-based solutions like Contour and Istio.

