#!/usr/bin/ruby

module Angular::AsfRoster
  use :AsfRosterServices

  $locationProvider.html5Mode(true).hashPrefix('!')

  case $routeProvider
  when '/committer/'
    templateUrl 'partials/committers.html'
    controller :Committers

  when '/committer/:name'
    templateUrl 'partials/committer.html'
    controller :Committer

  when '/committee/'
    templateUrl 'partials/committees.html'
    controller :PMCs

  when '/committee/:name'
    templateUrl 'partials/committee.html'
    controller :PMC

  else
    redirectTo '/'
  end

  controller :Layout do
    @groups = LDAP.groups()
    @committers = LDAP.committers()
    @pmcs = LDAP.pmcs()
    @members = LDAP.members()
    @info = INFO.get()
  end

  controller :Committers do
  end

  controller :PMCs do
  end

  controller :PMC do
    @name = $routeParams.name

    watch INFO.get(@name) do |value|
      @info = value || {members: []}
    end

    watch @pmcs[@name] do |value|
      @pmc = value || {memberUid: []}
    end

    def status(committer)
      if not committer
        return 'not found'
      elsif not (@pmc.memberUid.include? committer.uid or @pmc.memberUid.empty?)
        return 'not in LDAP'
      elsif not (@info.members.include? committer.uid or @info.members.empty?)
        return 'not in committee_info.txt'
      elsif @committers and not @committers[committer.uid] == committer
        return 'not in committer list'
      elsif committer.uid == @info.chair
        return 'chair'
      else
        return ''
      end
    end
  end

  controller :Committer do
    @uid = $routeParams.name
    @my_groups = []
    watch(@committers[@uid]) do |value| 
      @committer = value
      @member = value and @members.include? value.uid

      @my_pmcs = []
      for pmc in @pmcs
        @my_pmcs << pmc if @pmcs[pmc].memberUid.include? value.uid
      end

      @my_groups = []
      for group in @groups
        next if @my_pmcs.include? group
        next if %w(member committers).include? group
        @my_groups << group if @groups[group].memberUid.include? value.uid
      end
    end
  end

  filter :committer_match do |committers, text|
    results = []
    text = text.toLowerCase()

    if text.include? ' '
      words = text.split(/\s+/)
      for id in committers
        committer = committers[id]
        cn = committer.cn.toLowerCase()
        if words.all? {|word| cn.contains(word)}
          results << committer
        end
      end
    else
      for id in committers
        committer = committers[id]
        if committer.cn.toLowerCase().contains(text)
          results << committer
        elsif committer.uid.contains(text)
          results << committer
        elsif committer.mail and 
          committer.mail.any? {|email| email.contains(text)}
          results << committer
        elsif committer["asf-altEmail"] and
          committer["asf-altEmail"].any? {|email| email.contains(text)}
          results << committer
        end
      end
    end

    results.sort! {|a,b| return a.uid < b.uid ? -1 : +1}

    return results
  end

  directive :main do
    restrict :E
    def link(scope, element, attributes)
      element.find('*[autofocus]').focus()
    end
  end

  directive :asfId do
    def link(scope, element, attributes)
      observe attributes.asfId do |value|
        element.addClass 'member' if @members.include? value
      end
    end
  end
end