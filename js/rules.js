'use strict';
const eaeu = (a) => ['by', 'kz', 'am', 'kg'].includes(a.country);
const studentEligible = (a) =>
  a.student === 'yes' &&
  a.fulltime === 'yes' &&
  a.freeTime === 'yes' &&
  (a.program === 'research' || (['spo', 'higher'].includes(a.program) && a.accredited === 'yes'));
// Работа
function workRoute(a) {
  if (eaeu(a)) return 'eaeu';
  if (['rvp', 'rvpo', 'vnzh'].includes(a.status)) return 'resident';
  if (studentEligible(a)) return 'student';
  const uncertain = [a.country, a.status, a.entry, a.student].some((v) =>
    ['other', 'none', 'unknown'].includes(v),
  );
  if (
    uncertain ||
    (a.student === 'yes' && [a.fulltime, a.program, a.accredited, a.freeTime].includes('unknown'))
  )
    return 'review';
  return a.entry === 'free' ? 'patent' : a.entry === 'visa' ? 'permit' : 'review';
}

// Подбор документов
function plan(id, a) {
  const list = ['id'];
  const notes = [];
  const add = (...ids) => list.push(...ids);
  const note = (text) => notes.push(text);
  if (
    id !== 'vnzh-annual' &&
    !['by', 'kz', 'am', 'kg', 'uz', 'tj', 'az', 'md', 'cn', 'in'].includes(a.country)
  )
    note(
      'Гражданство требует отдельной проверки. Автоматический вывод о визовом режиме и льготах не делается.',
    );
  const residenceDocs = () => {
    if (['rvp', 'rvpo', 'vnzh'].includes(a.status)) add(a.status);
    if (a.status === 'stay') {
      if (a.country !== 'by') add('card');
      if (a.entry === 'visa') add('visa');
    }
    if (a.status === 'unknown' || a.entry === 'unknown')
      note('Уточните документ, подтверждающий законность пребывания или проживания.');
  };
  switch (id) {
    case 'stay':
      residenceDocs();
      add('arrival');
      if (a.purpose === 'study') add('enrollment');
      if (a.purpose === 'work') {
        add('contract');
        note(
          'Разрешительные документы для работы определяются отдельно в разделе «Документы для работы».',
        );
      }
      note('Сроки и порядок пребывания зависят от гражданства, соглашений и основания.');
      break;
    case 'vnzh-annual':
      if (a.hasVnzh !== 'yes') {
        note(
          'Ежегодное уведомление относится к обладателям ВНЖ. Сначала уточните свой действующий статус; пакет уведомления не сформирован.',
        );
        break;
      }
      add('vnzh', 'annualNotice', 'annualIncome');
      if (a.applicant === 'child') add('birth', 'guardian');
      if (a.applicant === 'ward') add('guardian');
      if (a.incomeSource === 'work') add('annualSalary');
      if (a.incomeSource === 'scholarship') add('annualScholarship');
      if (a.incomeSource === 'support') add('annualSupport');
      if (a.incomeSource === 'other' || a.incomeSource === 'unknown')
        note(
          'Уточните допустимый источник средств и способ отражения дохода; перечень документов зависит от конкретного источника.',
        );
      if (a.trips === 'yes') add('annualTrips');
      if (a.trips === 'unknown')
        note('Уточните сведения о выездах за отчётный год до заполнения уведомления.');
      if (a.fifthYear === 'yes')
        note(
          'По истечении каждого пятого года постоянного проживания уведомление подаётся лично непосредственно в территориальный орган МВД.',
        );
      else
        note(
          'До выбора способа подачи проверьте, не завершился ли очередной пятый год. В остальных случаях доступность личной, почтовой и электронной подачи уточняйте по действующим правилам.',
        );
      if (a.late === 'yes') {
        add('annualLate');
        note(
          'Обычный срок мог быть пропущен. Обратитесь в МВД для проверки возможности и условий подачи; список не подтверждает отсутствие нарушения.',
        );
      } else if (a.late === 'unknown') {
        note(
          'Сначала уточните дату получения ВНЖ и окончание очередного года проживания. Калькулятора сроков здесь нет.',
        );
      }
      note(
        'Срок подачи по общему правилу — два месяца после окончания очередного года со дня получения ВНЖ. Формы и условия проверяйте на дату обращения.',
      );
      note(
        'Проверено для учебной карточки 02.11.2026: статья 8 Закона № 115-ФЗ и Правила, утверждённые постановлением № 21. Изменения, вступающие с 01.01.2027, не выдаются за действующие требования.',
      );
      break;
    case 'rvp':
      add('application', 'translation', 'photo');
      if (a.age === 'child') {
        add('birth', 'guardian');
        note(adultOnly);
      }
      if (a.status === 'vnzh' || a.status === 'rvp' || a.status === 'rvpo')
        note(
          'У вас уже есть документ о проживании. Проверьте необходимость и допустимость нового обращения.',
        );
      if (a.basis === 'quota') add('quota', 'medical', 'language', 'duty');
      if (a.basis === 'family') {
        add('relationship', 'relative');
        note(
          'Родство само по себе не подтверждает право на РВП: требуется проверка конкретного семейного основания.',
        );
      }
      if (a.basis === 'study')
        note(
          'Для РВПО откройте карточку «Проживание в целях образования»: там проверяются организация, форма и программа.',
        );
      if (a.basis === 'unknown')
        note('Основание не установлено. Показан только начальный пакет для уточнения маршрута.');
      note(
        'Медицинские, языковые и иные требования, включая документы из страны проживания, проверяются по основанию и исключениям.',
      );
      break;
    case 'vnzh':
      add('application', 'translation', 'photo', 'duty');
      if (a.age === 'child') {
        add('birth', 'guardian', 'consent');
        note(adultOnly);
      }
      if (a.basis === 'rvp') {
        add('rvp', 'income', 'medical', 'language');
        if (a.status !== 'rvp')
          note(
            'Вы выбрали основание по РВП, но не указали действующее РВП. Требуется проверка основания и сроков.',
          );
      }
      if (a.basis === 'family') {
        add('relationship', 'relative');
        note(
          'Нужно установить конкретную норму для семейного основания; наличие родственника не гарантирует выдачу ВНЖ.',
        );
      }
      if (a.basis === 'education') {
        add('education');
        note(
          'Обучение не всегда даёт право на ВНЖ. Проверяются вид программы, результат обучения и конкретное основание.',
        );
      }
      if (a.basis === 'other')
        note(
          'Специальное основание не установлено. Полный перечень определяется после его проверки.',
        );
      if (a.housing === 'yes') add('housing');
      if (a.housing === 'unknown')
        note(
          'Уточните срок нахождения в России и требование о подтверждении права пользования жильём.',
        );
      if (a.status === 'vnzh')
        note(
          'При уже имеющемся ВНЖ возможна другая процедура: замена документа, а не первичная выдача.',
        );
      if (a.country === 'by')
        note(
          'Для граждан Беларуси действует особый порядок. Общий маршрут по РВП может не требоваться.',
        );
      break;
    case 'employment':
    case 'patent':
    case 'student-work': {
      residenceDocs();
      const route = workRoute(a);
      const descriptions = {
        eaeu: 'Гражданство государства ЕАЭС: патент и разрешение на работу не требуются по этому основанию.',
        resident:
          'Для обладателей РВП, РВПО или ВНЖ действует исключение из общего разрешительного порядка. Для РВП / РВПО отдельно проверьте территориальные ограничения.',
        student:
          'Указаны условия студенческого исключения. Подтвердите их документом учебной организации; работа должна быть в свободное от учёбы время.',
        patent:
          'Вероятен маршрут патента для временно пребывающего безвизового иностранца. Другие исключения и ограничения ещё требуют проверки.',
        permit:
          'Вероятен маршрут разрешения на работу при участии работодателя. Другие основания и исключения проверяются отдельно.',
        review:
          'Маршрут не определён: уточните гражданство, статус и условия обучения. Патент или разрешение автоматически не назначаются.',
      };
      note(descriptions[route]);
      if (id === 'patent') {
        if (route === 'patent')
          add('application', 'translation', 'arrival', 'medical', 'language', 'insurance', 'tax');
        else
          note(
            'Перечень для оформления патента не сформирован: ваши ответы указывают на другой маршрут или требуют уточнения.',
          );
        if (a.region === 'moscow' || a.region === 'mo')
          note(
            'Москва и Московская область — разные субъекты. Уточните действие региональных соглашений и условия работы в обоих субъектах.',
          );
        else note('Требования и размер платежа уточняются в выбранном регионе.');
        if (a.first !== 'yes')
          note(
            'Повторное оформление, переоформление и дубликат — разные процедуры; данный список описывает первоначальное обращение.',
          );
      } else {
        add('snils', 'employment', 'contract');
        if (route === 'patent') add('patent');
        if (route === 'permit') add('permit');
        if (route === 'student') add('study');
        if (id === 'employment' && a.qualification === 'yes') add('education');
        if (id === 'employment' && a.qualification === 'unknown')
          note('Уточните у работодателя требования к квалификации и специальным допускам.');
        if (id === 'student-work' && a.student !== 'yes')
          note('Студенческое основание не подтверждено; маршрут определён по другим ответам.');
      }
      note(
        'Перечень не охватывает все специальные категории. СНИЛС, договор и иные документы могут оформляться с участием работодателя.',
      );
      break;
    }
    case 'admission':
      add('application', 'education', 'photo');
      if (a.foreign === 'yes') {
        add('translation', 'recognition');
        note(
          'Признание и легализация не назначаются всем: сначала проверяются международные соглашения и требования организации.',
        );
      }
      if (a.foreign === 'unknown') note('Уточните страну выдачи документа об образовании.');
      if (a.quota === 'yes') add('direction');
      if (a.quota === 'unknown')
        note('Уточните способ поступления: квота и общий конкурс имеют разные процедуры.');
      note(
        {
          college: 'Для колледжа уточните требования к документу об общем образовании.',
          bachelor: 'Для бакалавриата / специалитета уточните вступительные испытания.',
          master:
            'Для магистратуры нужен соответствующий предшествующий уровень высшего образования.',
          research: 'Для аспирантуры уточните допустимый уровень предшествующего образования.',
        }[a.level],
      );
      note(
        'Медицинские документы, сроки и дополнительные материалы устанавливаются правилами приёма организации.',
      );
      break;
    case 'rvpo': {
      residenceDocs();
      const eligible =
        a.student === 'yes' &&
        a.fulltime === 'yes' &&
        a.state === 'yes' &&
        (a.program === 'research' || (a.program === 'higher' && a.accredited === 'yes'));
      if (eligible) {
        add('application', 'translation', 'photo', 'enrollment', 'medical', 'duty');
        note(
          'Указаны базовые условия образовательного маршрута. Право и полный пакет проверяет подразделение МВД.',
        );
      } else
        note(
          'Базовые условия РВПО не подтверждены: нужны соответствующая программа высшего образования, очная форма и государственная организация. Список для подачи не сформирован.',
        );
      if (a.status === 'vnzh' || a.status === 'rvpo')
        note('У вас уже есть ВНЖ или РВПО. Уточните необходимость новой процедуры.');
      break;
    }
    case 'study-proof':
      if (a.educationState === 'finished') add('education');
      else add('study');
      if (a.educationState === 'leave') add('leave');
      if (a.purpose === 'work')
        note(
          'Для работодателя важны форма и программа обучения, аккредитация и текущий статус. Само наличие студенческого билета не подтверждает все условия.',
        );
      if (a.purpose === 'migration') {
        add('enrollment');
        note(
          'Уточните в международном отделе, какие реквизиты и срок обучения нужны для конкретной миграционной процедуры.',
        );
      }
      if (a.purpose === 'other')
        note('Получатель справки определяет необходимые сведения и срок её актуальности.');
      break;
    case 'arrival':
    case 'move':
    case 'dorm':
      residenceDocs();
      add('notice', 'host');
      if (a.home === 'flat') add('housing');
      if (a.home === 'dorm' || id === 'dorm') add('dorm');
      if (a.home === 'hotel')
        note(
          'Гостиница выполняет обязанности принимающей стороны; уточните оформление у администратора.',
        );
      if (id === 'move') {
        add('arrival');
        note(
          'Учёт по месту пребывания и регистрация по месту жительства — разные процедуры. При переезде с РВП / РВПО проверьте ограничения региона проживания.',
        );
        if (a.moveRegion !== 'no')
          note(
            'Изменение региона требует отдельной проверки статуса и разрешённых условий проживания.',
          );
      }
      if (id === 'dorm') {
        add(a.role === 'student' ? 'enrollment' : 'contract');
        note(
          a.first === 'yes'
            ? 'Пакет для первичного заселения согласуйте с администрацией.'
            : 'При повторном заселении уточните, какие документы нужно обновить.',
        );
      }
      note(
        'Срок, порядок подачи и документы принимающей стороны уточняются по гражданству, адресу и статусу. Специальные региональные режимы здесь не рассчитываются.',
      );
      break;
    case 'child':
      add('birth', 'guardian', 'translation');
      if (a.childAge === 'teen') add('consent');
      if (a.purpose === 'stay') add('notice', 'host');
      if (a.purpose === 'residence') {
        add('application', 'photo', 'relationship');
        note(
          'Для РВП и ВНЖ ребёнка различаются основания, возрастные требования и пакет. Нужна индивидуальная проверка; этот список начальный.',
        );
      }
      if (a.purpose === 'study') {
        add('application');
        note('Продолжите в карточке «Учёба ребёнка» для выбора организации.');
      }
      note(
        'Гражданство в этой анкете относится к ребёнку. Документ, удостоверяющий личность, зависит от его возраста и законодательства страны.',
      );
      break;
    case 'family-stay':
      residenceDocs();
      add('relationship', 'relative', 'translation');
      note('Это пакет для проверки семейного основания, а не подтверждение права на РВП / ВНЖ.');
      note(
        a.relative === 'spouse'
          ? 'Для супругов проверяются брак и дополнительные условия конкретной нормы.'
          : a.relative === 'parent'
            ? 'Для основания через родителя уточняются гражданство, проживание и другие условия.'
            : 'Для основания через ребёнка проверяются гражданство ребёнка, родительство и дополнительные условия.',
      );
      note(
        a.relativeStatus === 'ru'
          ? 'Родственник — гражданин РФ: необходимо установить применимую норму.'
          : a.relativeStatus === 'vnzh'
            ? 'ВНЖ родственника не означает автоматического права на ваш ВНЖ.'
            : 'Статус родственника нужно уточнить до определения полного пакета.',
      );
      break;
    case 'child-study':
      add('application', 'birth', 'guardian', 'translation');
      if (a.previous === 'yes') add('previous');
      if (a.institution === 'college') add('education');
      if (a.institution === 'school')
        note(
          'Для школы отдельно проверяются документы о законности нахождения ребёнка и действующие правила тестирования по русскому языку, включая исключения. Этот начальный список нужно дополнить по требованиям школы.',
        );
      if (a.institution === 'garden')
        note(
          'Для детского сада уточните очередь, возраст, медицинские документы и местные правила приёма.',
        );
      if (a.institution === 'college')
        note('Для колледжа применяются правила приёма выбранной образовательной организации.');
      note(
        'Перечень предварительный: возраст, адрес, статус ребёнка и регион могут менять требования.',
      );
      break;
    default:
      throw new Error('Неизвестная карточка');
  }
  note('Перед обращением проверьте полный перечень и актуальные формы в принимающей организации.');
  return { ids: [...new Set(list)], notes: notes.filter(Boolean) };
}

window.Guide.plan = plan;
window.Guide.workRoute = workRoute;
